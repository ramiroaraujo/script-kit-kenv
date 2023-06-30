// Name: FF Inject Environment

import "@johnlindquist/kit";

// 1. Prompt for a local project
const allFolders = (await exec(`cd ~/FactoryFix && ls -d */`)).all.split('\n').map(folder => folder.replace('/', ''));
const validFolders = allFolders.map(async folder => {
    try {
        let path = home(`FactoryFix/${folder}/package.json`);
        const file = await readFile(path, 'utf-8');
        const packageJson = JSON.parse(file);

        return packageJson.dependencies['@nestjs/core'] ? folder : null;
    } catch (e) {
        return null;
    }
});
const folders = (await Promise.all(validFolders)).filter(Boolean);
const folder = await arg("Select a folder", folders);

// 2. Prompt for an environment
const environments = [
    "ff-app-dev",
    "ff-app-iso-1",
    "ff-app-iso-2",
    "ff-app-iso-3",
    "ff-app-iso-4",
    "ff-app-prod",
];
// your actual environments
const env = await arg("Select an environment", environments);

// 3. Get the service name
const tfvarsPath = home(`FactoryFix/${folder}/deployment/terraform/terraform.tfvars`);
let tfvarsContent = await readFile(tfvarsPath, 'utf-8');
let serviceName = tfvarsContent.match(/service_name\s*=\s*"(.*)"/)[1];

// 4. Fetch the environment variables of the instance
const cloudRunEnv = await exec(`/opt/homebrew/bin/gcloud run services describe ${serviceName} --platform=managed --project=${env} --format="json" --region=us-central1`);
const envVars = JSON.parse(cloudRunEnv.stdout).spec.template.spec.containers[0].env;

// 5. Overwrite the variables in config.env
const configPath = home(`FactoryFix/${folder}/config.env`);

// 6. Make a copy of the original config.env
const backupPath = home(`FactoryFix/${folder}/config.env.backup`);
await copyFile(configPath, backupPath);

// Create a dictionary from the envVars array for easy access
const envVarsDict = Object.fromEntries(envVars.map(variable => [variable.name, variable.value]));

// 7. Read the original file line by line and replace the values as needed
let configLines = (await readFile(configPath, 'utf-8')).split('\n');
let newConfigLines = [];

for (let line of configLines) {
    let match = line.match(/^(\s*)(\w+)(\s*=\s*)(.*)$/);
    if (match) {
        let [_, whitespace, key, separator, value] = match;
        if (key in envVarsDict) {
            // Replace the value while keeping the whitespace, the key, and the separator intact
            newConfigLines.push(`${whitespace}${key}${separator}${envVarsDict[key]}`);
            // Delete this key from envVarsDict so we can add the remaining keys at the end
            delete envVarsDict[key];
        } else {
            // Keep the line as it is
            newConfigLines.push(line);
        }
    } else {
        // Keep the line as it is
        newConfigLines.push(line);
    }
}

// Append the remaining keys from envVarsDict
for (let [key, value] of Object.entries(envVarsDict)) {
    newConfigLines.push(`${key}=${value}`);
}

// 8. Write the updated environment variables back to config.env
let newConfig = newConfigLines.join('\n');
await writeFile(configPath, newConfig);

await notify(`Environment variables from ${env} injected successfully`);
