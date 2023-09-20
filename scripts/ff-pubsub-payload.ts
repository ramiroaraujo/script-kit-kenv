// Name: ff pubsub payload

import "@johnlindquist/kit"

const dayjs = await npm('dayjs')

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

// ----------------- cache helper ----------------
let cacheData = await db(`ff-pubsub-payload-${env}`, {content: {}})
let expire30days = 1000 * 60 * 60 * 24 * 30
let expire1day = 1000 * 60 * 60 * 24 * 1
const cache = async (type, expires, invoke: Function) => {
    if (cacheData.data.content[type]?.data && Date.now() - cacheData.data.content[type]?.expires < expires) {
        return cacheData.data.content[type].data
    }
    try {
        const data = await invoke()
        cacheData.data.content[type] = {expires: Date.now() + expires, data}
        await cacheData.write()
        return data
    } catch (e) {
        notify(e.message)
        exit()
    }
}
const clearCache = async (path?: string) => {
    if (path) {
        cacheData.data.content[path] = undefined;
    } else {
        cacheData.data.content = {};
    }
    await cacheData.write();
}

const invalidate = {name: 'Invalidate cache', type: 'invalidate', value: 'invalidate'}
// ----------------- cache helper ----------------

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

//cache topics for 30 days
const topics: any[] = await cache(`topics.${serviceName}`, expire30days, async () => {
    const serviceUrl = (await exec(`/opt/homebrew/bin/gcloud run services describe ${serviceName} --platform managed --project=${env} --region us-central1 --format "value(status.url)"`)).stdout

    //list pubsub topics for the service url
    let subscriptions = await exec(`/opt/homebrew/bin/gcloud pubsub subscriptions list --project=${env} --format=json | /opt/homebrew/bin/jq "[.[] | select(.pushConfig.oidcToken.audience == \\"${serviceUrl}\\")]"`);
    const topics = JSON.parse(subscriptions.stdout)

    if (!topics.length) {
        throw new Error(`No topics found for ${serviceUrl}`)
    }
    return topics
})

const topic = await arg('Choose a topic', [...topics, invalidate].map(topic => {
    const invalidate = topic.type === 'invalidate';
    return ({
        name: !invalidate ? topic.topic?.split('/').pop() : topic.name,
        value: !invalidate ? topic.name : topic.value
    });
}))
if (topic === 'invalidate') {
    await clearCache(`topics.${serviceName}`)
    notify('Cache invalidated')
    exit()
}

//cache payloads for a day
let payloads: any[] = await cache(`payloads.${serviceName}.${topic}`, expire1day, async () => {
    let payloads = []
    const dateUnits = ['week', 'day', 'hour', 'minute']
    let length = 10
    do {
        let dateUnit = dateUnits.pop()
        const execute = await exec(`/opt/homebrew/bin/gcloud logging read 'resource.labels.service_name="${serviceName}" severity="DEBUG" jsonPayload.body.subscription="${topic}" timestamp>="'$(/opt/homebrew/bin/gdate -d '-1 ${dateUnit}' --iso-8601=seconds --utc)'"' --limit=20 --format=json --project=${env} | /opt/homebrew/bin/jq '[.[] | .jsonPayload.body]'`)
        payloads = JSON.parse(execute.stdout)
    } while (payloads.length < length && dateUnits.length)

    if (!payloads.length) {
        throw new Error(`No payloads found for ${topic}`)
    }

    return payloads
})

log('before payload')

const payload = await arg({
    placeholder: 'Choose a payload',
}, [invalidate, ...payloads].map(payload => {
    const invalidate = payload.type === 'invalidate';
    const name = !invalidate ? `From ${dayjs(payload.message.publishTime).format('MMM D, YYYY h:mm A')}` : payload.name
    return {
        name,
        preview: () => {
            const text = Buffer.from(payload.message.data, 'base64').toString('utf-8')
            const pretty = JSON.stringify(JSON.parse(text), null, 2)
                .replaceAll('\\n', '\n')
            return `<pre>${pretty}</pre>`
        },
        value: invalidate ? payload.value : payload
    }
}))

if (payload === 'invalidate') {
    await clearCache(`payloads.${serviceName}.${topic}`)
    notify('Cache invalidated')
    exit()
}

const operation = await arg('What do you need?', [
    {name: 'Copy payload to clipboard', description: 'Ready to paste as payload in a POST request', value: 'copy'},
    { name: 'Copy the base64 decoded data to clipboard', description: 'Useful for modifying the data', value: 'copy-decoded' },
])

switch (operation) {
    case 'copy':
        await clipboard.writeText(JSON.stringify(payload, null, 2))
        notify('Complete payload copied to clipboard')
        break;
    case 'copy-decoded':
        const text = Buffer.from(payload.message.data, 'base64').toString('utf-8')
        const pretty = JSON.stringify(JSON.parse(text), null, 2)
        await clipboard.writeText(pretty)
        notify('Decoded payload copied data to clipboard')
        break;
    default:
        break;
}
