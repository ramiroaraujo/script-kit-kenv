// Name: ff pubsub payload

import "@johnlindquist/kit"

// choose env
const env = await arg("Choose an environment", [
    "ff-app-dev",
    'ff-app-prod',
    'ff-app-iso-1',
    'ff-app-iso-2',
    'ff-app-iso-3',
    'ff-app-iso-4',
    'ff-app-e2e',
])

//choose folder / service
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
const folder = await arg({
    placeholder: "Select a folder to inject the debug config",
}, folders);

const path = home(`FactoryFix/${folder}`)

//extract service name, then service url
const tfvarsPath = `${path}/deployment/terraform/terraform.tfvars`
let tfVars = await readFile(tfvarsPath, 'utf-8');
const serviceNameMatch = tfVars.match(/^service_name\s*=\s*"([^"]+)"/m);
const serviceName = serviceNameMatch[1];
const serviceUrl = (await exec(`/opt/homebrew/bin/gcloud run services describe ${serviceName} --platform managed --project=${env} --region us-central1 --format "value(status.url)"`)).stdout

//list pubsub topics for the service url
const topics = JSON.parse((await exec(`gcloud pubsub subscriptions list --project=${env} --format=json | jq "[.[] | select(.pushConfig.oidcToken.audience == \\"${serviceUrl}\\")]`)).stdout)
