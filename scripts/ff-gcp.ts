// Name: ff gcp

import "@johnlindquist/kit"

class Cache {
    private cache

    constructor(private structure: any, private env: string, private expires: number) {
    }

    private async init() {
        this.cache = await db(`ff-gcp-${env}`, {content: {}})
    }

    async remember(type: string, invoke: Function) {
        await this.init()
        let expires = 1000 * 60 * 60 * 24 * 7; //cache for 7 days
        let content = this.cache.data?.content[type];
        if (content?.data && Date.now() - content?.expires < expires) {
            return content.data
        }
        const data = await invoke()
        this.cache.data['content'] = {[type]: {expires: Date.now() + expires, data}}
        await this.cache.write()
        return data
    }

    async clear() {
        await this.init()
        this.cache.data.content = {};
        await this.cache.write();
    }
}


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
            type: 'logs'
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
    {
        name: 'Invalidate Cache', value: {
            type: 'invalidate'
        }
    }
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

//setup cache, expire in 7 days
const cache = new Cache({}, env, 1000 * 60 * 60 * 24 * 7)

const open = {name: 'Open', value: finalUrl}

if (url.type === 'run') {
    const data = await cache.remember('run', async () => {
        const cloudRunInstances = await exec(`/opt/homebrew/bin/gcloud run services list --platform=managed --project=${env} --format="json"`)
        return JSON.parse(cloudRunInstances.stdout)
    })

    const instances = data.map(instance => ({
        name: instance.metadata.name,
        value: `https://console.cloud.google.com/run/detail/${instance.metadata.labels['cloud.googleapis.com/location']}/${instance.metadata.name}/metrics?project=${env}`,
    }))

    finalUrl = await arg("Choose a Cloud Run instance", [open, ...instances])
} else if (url.type === 'scheduler') {
    const data = await cache.remember('scheduler', async () => {
        const cloudSchedulerInstances = await exec(`/opt/homebrew/bin/gcloud scheduler jobs list --project=${env} --format="json"`)
        return JSON.parse(cloudSchedulerInstances.stdout)
    })

    const schedulerInstances = data.map(job => ({
        name: job.name.split('/').pop(),
        description: job.description,
        value: job.name.split('/').pop(),
    }))

    const result = await arg("Choose a Cloud Scheduler task", [open, ...schedulerInstances])
    if (result !== 'Open') {
        await clipboard.writeText(result)
        await notify('paste the name into the filters')
    }
} else if (url.type === 'storage') {
    const data = await cache.remember('storage', async () => {
        const storageBuckets = await exec(
            `/opt/homebrew/bin/gcloud storage buckets list --project=${env} --format="json"`
        );
        return JSON.parse(storageBuckets.stdout)
    })

    const buckets = data.map(bucket => ({
        name: bucket.name,
        value: `https://console.cloud.google.com/storage/browser/${bucket.name}?project=${env}`,
    }));

    finalUrl = await arg('Choose a Storage bucket', [open, ...buckets]);
} else if (url.type === 'secrets') {

    const data = await cache.remember('secrets', async () => {
        const secretsOutput = await exec(
            `/opt/homebrew/bin/gcloud secrets list --project=${env} --format="json"`
        );
        return JSON.parse(secretsOutput.stdout);
    })

    const secrets = data.map(secret => ({
        name: secret.name.split('/').pop(),
        value: `https://console.cloud.google.com/security/secret-manager/secret/${secret.name.split('/').pop()}?project=${env}`,
    }));
    const openSecrets = {name: 'Open', value: finalUrl};

    finalUrl = await arg('Choose a Secret', [openSecrets, ...secrets]);
} else if (url.type === 'logs') {
    const data = await cache.remember('logs', async () => {
        const cloudRunInstances = await exec(`/opt/homebrew/bin/gcloud run services list --platform=managed --project=${env} --format="json"`)
        return JSON.parse(cloudRunInstances.stdout)
    });

    const instances = data.map(instance => ({
        name: instance.metadata.name,
        value: `https://console.cloud.google.com/logs/query;query=resource.labels.service_name%3D%22${instance.metadata.name}%22;summaryFields=:false:32:beginning?project=${env}`,
    }))
    const open = {name: 'Open', value: finalUrl}

    finalUrl = await arg("Choose a Cloud Run instance", [open, ...instances])
} else if (url.type === 'invalidate') {
    await cache.clear()
    await notify('Cache cleared')
    exit()
}

//open url in chrome in FF profile
await exec(`open -na "Google Chrome" --args --profile-directory="Profile 1" "${finalUrl}"`)
