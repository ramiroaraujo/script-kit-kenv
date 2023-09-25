// Name: ff pubsub payload

import "@johnlindquist/kit"
import {CacheHelper, expirePresets} from "../lib/cache-helper";
import {binPath} from "../lib/bin-helper";
import {getFFLocalServices, selectEnv} from "../lib/ff-helper";
import {FFService} from "../lib/ff-service";

const dayjs = await npm('dayjs')

const gcloud = await binPath('gcloud')
const jq = await binPath('jq')
const date = await binPath('gdate')

const cache = new CacheHelper()

// choose env
const env = await selectEnv();

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
    const folders = await getFFLocalServices();
    const folder = await arg("Select a folder to inject the environment", folders);

    const service = await FFService.init(folder);
    serviceName = await service.getServiceName();

    //cache topics for 30 days
    const topics  = await cache.remember(`topics.${serviceName}`, async () => {
        const serviceUrl = (await exec(`${gcloud} run services describe ${serviceName} --platform managed --project=${env} --region us-central1 --format "value(status.url)"`)).stdout

        //list pubsub topics for the service url
        const { stdout: subscriptions} = await exec(`${gcloud} pubsub subscriptions list --project=${env} --format=json | ${jq} "[.[] | select(.pushConfig.oidcToken.audience == \\"${serviceUrl}\\")]"`);
        const topics = JSON.parse(subscriptions)

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
    const topics = await cache.remember(`topics`, async () => {
        const { stdout: reponse } = await exec(`${gcloud} pubsub subscriptions list --project=${env} --format=json`)
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

    const selectedTopic:Record<string, string>|'invalidate' = await arg('Choose a topic', [...topics, cache.defaultInvalidate])
    if (selectedTopic === 'invalidate') {
        await cache.clear(`topics`)
        notify('Cache invalidated')
        exit()
    }
    serviceName = selectedTopic.serviceName;
    topic = selectedTopic.name;
}

//cache payloads for a day
const payloads = await cache.remember(`payloads.${serviceName}.${topic}`, async () => {
    let payloads = []
    const dateUnits = ['week', 'day', 'hour', 'minute']
    const length = 10
    do {
        const dateUnit = dateUnits.pop()
        const {stdout: response} = await exec(`${gcloud} logging read 'resource.labels.service_name="${serviceName}" severity="DEBUG" jsonPayload.body.subscription="${topic}" timestamp>="'$(${date} -d '-1 ${dateUnit}' --iso-8601=seconds --utc)'"' --limit=20 --format=json --project=${env} | ${jq} '[.[] | .jsonPayload.body]'`)
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
    const name = !invalidate ? `Payload from ${dayjs(payload.message.publishTime).format('MMM D, YYYY h:mm A')}` : payload.name
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
    case 'copy-decoded': {
        const text = Buffer.from(payload.message.data, 'base64').toString('utf-8')
        const pretty = JSON.stringify(JSON.parse(text), null, 2)
        await clipboard.writeText(pretty)
        notify('Decoded payload copied data to clipboard')
        break;
    }
    default:
        break;
}
