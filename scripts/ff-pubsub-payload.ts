// Name: ff pubsub payload

import "@johnlindquist/kit"
import {CacheHelper, expirePresets} from "../lib/cache-helper";

const dayjs = await npm('dayjs')

const cache = new CacheHelper()

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

cache.setKey(`ff-pubsub-payload-${env}`).setDefaultExpires('1m')
await cache.init()

// select type of operation
let serviceName = ''
let topic = ''

const operationType = await arg('How do you want to search for a PubSub?', [
    {name: 'Search by topic', value: 'topic'},
    {name: 'Search by service', value: 'service'}
])

if (operationType === 'service') {
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
    serviceName = serviceNameMatch[1];

//cache topics for 30 days
    const topics: any[] = await cache.remember(`topics.${serviceName}`, async () => {
        const serviceUrl = (await exec(`/opt/homebrew/bin/gcloud run services describe ${serviceName} --platform managed --project=${env} --region us-central1 --format "value(status.url)"`)).stdout

        //list pubsub topics for the service url
        let subscriptions = await exec(`/opt/homebrew/bin/gcloud pubsub subscriptions list --project=${env} --format=json | /opt/homebrew/bin/jq "[.[] | select(.pushConfig.oidcToken.audience == \\"${serviceUrl}\\")]"`);
        const topics = JSON.parse(subscriptions.stdout)

        if (!topics.length) {
            throw new Error(`No topics found for ${serviceUrl}`)
        }
        return topics
    })

    topic = await arg('Choose a topic', [...topics, cache.defaultInvalidate].map(topic => {
        const invalidate = topic.value === 'invalidate';
        return ({
            name: !invalidate ? topic.topic?.split('/').pop() : topic.name,
            value: !invalidate ? topic.name : topic.value
        });
    }))
    if (topic === 'invalidate') {
        await cache.clear(`topics.${serviceName}`)
        notify('Cache invalidated')
        exit()
    }
} else if (operationType === 'topic') {
    //list all topics and prompt to select one
    const topics:any[] = await cache.remember(`topics`, async () => {
        const { stdout: reponse } = await exec(`/opt/homebrew/bin/gcloud pubsub subscriptions list --project=${env} --format=json`)
        const subscriptions = JSON.parse(reponse)
        const topics = subscriptions
            .map(subscription => {
                //https://ats-anywhere-3c4avboiyq-uc.a.run.app
                try {
                    const serviceName = subscription.pushConfig.oidcToken.audience.replace(/^https:\/\/(.+?)-\w{10}-uc\.a\.run\.app$/, '$1')
                    return ({
                        name: `${subscription.topic.split('/').pop()} on ${serviceName}`,
                        value: {
                            name: subscription.name,
                            serviceName
                        }
                    })
                } catch (e) {
                    return;
                }
            })
            .filter(Boolean)
        return topics
    })

    const selectedTopic:any = await arg('Choose a topic', [...topics, cache.defaultInvalidate])
    if (selectedTopic === 'invalidate') {
        await cache.clear(`topics`)
        notify('Cache invalidated')
        exit()
    }
    serviceName = selectedTopic.serviceName;
    topic = selectedTopic.name;
}

//cache payloads for a day
let payloads: any[] = await cache.remember(`payloads.${serviceName}.${topic}`, async () => {
    let payloads = []
    const dateUnits = ['week', 'day', 'hour', 'minute']
    let length = 10
    do {
        let dateUnit = dateUnits.pop()
        const {stdout: response} = await exec(`/opt/homebrew/bin/gcloud logging read 'resource.labels.service_name="${serviceName}" severity="DEBUG" jsonPayload.body.subscription="${topic}" timestamp>="'$(/opt/homebrew/bin/gdate -d '-1 ${dateUnit}' --iso-8601=seconds --utc)'"' --limit=20 --format=json --project=${env} | /opt/homebrew/bin/jq '[.[] | .jsonPayload.body]'`)
        payloads = JSON.parse(response)
    } while (payloads.length < length && dateUnits.length)

    if (!payloads.length) {
        throw new Error(`No payloads found for ${topic}`)
    }

    return payloads
}, expirePresets["1d"])

log('before payload')

const payload = await arg({
    placeholder: 'Choose a payload',
}, [cache.defaultInvalidate, ...payloads].map(payload => {
    const invalidate = payload.value === 'invalidate';
    debugger;
    const name = !invalidate ? `From ${dayjs(payload.message.publishTime).format('MMM D, YYYY h:mm A')}` : payload.name
    return {
        name,
        preview: () => {
            const invalidate = payload.value === 'invalidate';
            if (invalidate) return ''
            const text = Buffer.from(payload.message.data, 'base64').toString('utf-8')
            const pretty = JSON.stringify(JSON.parse(text), null, 2)
                .replaceAll('\\n', '\n')
            return `<pre>${pretty}</pre>`
        },
        value: invalidate ? payload.value : payload
    }
}))

if (payload === 'invalidate') {
    await cache.clear(`payloads.${serviceName}.${topic}`)
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
