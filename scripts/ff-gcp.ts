// Name: ff gcp

import "@johnlindquist/kit"

const urls = [
    {
        name: 'Cloud Run', value: {
            url: 'https://console.cloud.google.com/run?project=',
            type: 'run'
        }
    },
    {
        name: 'Cloud Scheduler', value: {
            url: 'https://console.cloud.google.com/cloudscheduler?project=',
            type: 'scheduler'
        }
    },
    {
        name: 'Firestore', value: {
            url: 'https://console.cloud.google.com/firestore?project=',
            type: null
        }
    },
    {
        name: 'Logs', value: {
            url: 'https://console.cloud.google.com/logs/query?project=',
            type: null
        }
    },
    {
        name: 'Errors', value: {
            url: 'https://console.cloud.google.com/errors?project=',
            type: null
        }
    },
    {
        name: 'Storage', value: {
            url: 'https://console.cloud.google.com/storage/browser?project=',
            type: 'storage'
        }
    },
    {
        name: 'Secret Manager', value: {
            url: 'https://console.cloud.google.com/security/secret-manager?project=',
            type: 'secrets'
        }
    },
]

//select from a list of options
const env = await arg("Choose an environment", [
    "ff-app-dev",
    'ff-app-prod',
    'ff-app-iso-1',
    'ff-app-iso-2',
    'ff-app-iso-3',
    'ff-app-iso-4',
    'ff-app-e2e',
])

//select from the urls list
const url = await arg("Choose a url", urls)

//append env
let finalUrl = `${url.url}${env}`

switch (url.type) {
    case 'run':
        const cloudRunInstances = await exec(`/opt/homebrew/bin/gcloud run services list --platform=managed --project=${env} --format="json"`)
        const data = JSON.parse(cloudRunInstances.stdout)

        const instances = data.map(instance => ({
            name: instance.metadata.name,
            value: `https://console.cloud.google.com/run/detail/${instance.metadata.labels['cloud.googleapis.com/location']}/${instance.metadata.name}/metrics?project=${env}`,
        }))
        const open = {name: 'Open', value: finalUrl}

        finalUrl = await arg("Choose a Cloud Run instance", [open, ...instances])
        break

    case 'scheduler':
        const cloudSchedulerInstances = await exec(`/opt/homebrew/bin/gcloud scheduler jobs list --project=${env} --format="json"`)
        const schedulerData = JSON.parse(cloudSchedulerInstances.stdout)

        const schedulerInstances = schedulerData.map(job => ({
            name: job.name.split('/').pop(),
            description: job.description,
            value: `https://console.cloud.google.com/cloudscheduler/job/${env}/${job.name.split('/').pop()}?project=${env}`,
        }))
        const schedulerOpen = {name: 'Open', value: finalUrl}

        finalUrl = await arg("Choose a Cloud Scheduler instance", [schedulerOpen, ...schedulerInstances])
        break;
    case 'storage':
        const storageBuckets = await exec(
            `/opt/homebrew/bin/gcloud storage buckets list --project=${env} --format="json"`
        );
        const storageData = JSON.parse(storageBuckets.stdout);

        const buckets = storageData.map(bucket => ({
            name: bucket.name,
            value: `https://console.cloud.google.com/storage/browser/${bucket.name}?project=${env}`,
        }));
        const openStorage = { name: 'Open', value: finalUrl };

        finalUrl = await arg('Choose a Storage bucket', [openStorage, ...buckets]);
        break;
    case 'secrets':
        const secretsOutput = await exec(
            `/opt/homebrew/bin/gcloud secrets list --project=${env} --format="json"`
        );
        const secretsData = JSON.parse(secretsOutput.stdout);

        const secrets = secretsData.map(secret => ({
            name: secret.name.split('/').pop(),
            value: `https://console.cloud.google.com/security/secret-manager/secret/${secret.name.split('/').pop()}?project=${env}`,
        }));
        const openSecrets = { name: 'Open', value: finalUrl };

        finalUrl = await arg('Choose a Secret', [openSecrets, ...secrets]);
        break;}

await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${finalUrl}"`)


//open url in chrome in FF profile
// await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${urlWithEnv}"`)