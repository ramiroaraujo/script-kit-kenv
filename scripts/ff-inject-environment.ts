// Name: ff Inject Environment

import "@johnlindquist/kit";
import {getFFLocalServices, selectEnv} from "../lib/ff-helper";
import {FFService} from "../lib/ff-service";
import {binPath} from "../lib/bin-helper";

const gcloud = await binPath('gcloud');

const folders = await getFFLocalServices();
const folder = await arg("Select a folder to inject the environment", folders);


// 2. Prompt for an environment
const env = await selectEnv()

// 3. Get the service name
const service = await FFService.init(folder);
const serviceName = await service.getServiceName();

// 4. Fetch the environment variables of the instance
const {stdout:cloudRunEnv} = await exec(`${gcloud} run services describe ${serviceName} --platform=managed --project=${env} --format="json" --region=us-central1`);
const envVars = JSON.parse(cloudRunEnv).spec.template.spec.containers[0].env;

// 5. Overwrite the variables in config.env
const configPath = `${service.getPath()}/config.env`

// 6. Make a copy of the original config.env
const backupPath = `${service.getPath()}/config.bak.env`;

if (!await pathExists(backupPath)) {
    await copyFile(configPath, backupPath);
}

// Create a dictionary from the envVars array for easy access
const envVarsDict = Object.fromEntries(envVars.map(variable => [variable.name, variable.value]));

// If GOOGLE_AUTH_AUDIENCE exists, set it to blank
if ('GOOGLE_AUTH_AUDIENCE' in envVarsDict) {
    envVarsDict['GOOGLE_AUTH_AUDIENCE'] = '';
}

// If USE_GOOGLE_S2S_AUTH exists, set it to false
if ('USE_GOOGLE_S2S_AUTH' in envVarsDict) {
    envVarsDict['USE_GOOGLE_S2S_AUTH'] = 'false';
}

const allowedUrls = new Set(['FF_UI_V2_URL', 'JOB_BOARD_UI_URL', 'UI2_BASE_URL', 'V4_API_URL']);
let urlTail = '';

for (const [key, value] of Object.entries(envVarsDict)) {
    if (key.endsWith('_URL') && value.includes('.a.run.app')) {
        urlTail = value.match(/-([a-z0-9]+-uc\.a\.run\.app)$/)[1];
        break;
    }
}

for (const [key, value] of Object.entries(envVarsDict)) {
    if (key.endsWith('_URL') && !allowedUrls.has(key) && value.endsWith(urlTail)) {
        const subdomain = value.split(`https://`)[1].split(`-${urlTail}`)[0];
        envVarsDict[key] = `http://${subdomain}:8080`;
    }
}

// 7. Read the original file line by line and replace the values as needed
const configLines = (await readFile(configPath, 'utf-8')).split('\n');
const newConfigLines = [];

for (const line of configLines) {
    const match = line.match(/^(\s*)(\w+)(\s*=\s*)(.*)$/);
    if (match) {
        const [_, whitespace, key, separator] = match;
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
for (const [key, value] of Object.entries(envVarsDict)) {
    newConfigLines.push(`${key}=${value}`);
}

// 8. Write the updated environment variables back to config.env
const newConfig = newConfigLines.join('\n');
await writeFile(configPath, newConfig);

notify(`Environment variables from ${env} injected successfully`);
