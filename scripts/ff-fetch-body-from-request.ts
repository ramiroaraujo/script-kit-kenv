// Name: ff Fetch Body from Request

import "@johnlindquist/kit"
import {selectEnv} from "../lib/ff-helper";
import {CacheHelper} from "../lib/cache-helper";
import {binPath} from "../lib/bin-helper";
import relativeTime from "dayjs/plugin/relativeTime.js";

const dayjs = await npm('dayjs')
dayjs.extend(relativeTime);

type Request = {
    httpRequest: {
        requestUrl: string
    },
    resource: {
        labels: {
            service_name: string
        }
    },
    timestamp: string,
    trace: string
}

const gcloud = await binPath('gcloud')

const cache = new CacheHelper().setDefaultExpires('1w')

const clipboardText = await clipboard.readText();
//check if clipboard text is a gcloud log url or gcloud log JSON
let fetch = true
let request:Request
let env:string
if (clipboardText.startsWith('https://console.cloud.google.com/logs/query')) {
    try {
        const url = new URL(clipboardText)
        const params = url.pathname
            .substring('/logs/query;'.length)
            .split(';')
            .map((pair) => pair.split('='))
            .reduce((acc, [key, value]) => ({...acc, [key]: decodeURIComponent(value)}), {} as Record<string, any>);
        params.query = params.query.split('\n')
            .map((line) => line.trim().split('='))
            .reduce((acc, [key, value]) => ({...acc, [key]: value.replace(/^"?([^"]+)"?$/, '$1')}), {})
        request = {
            httpRequest: {
                requestUrl: params.query['httpRequest.requestUrl']
            },
            trace: params.query['insertId'],
            timestamp: params.cursorTimestamp,
            resource: {
                labels: {
                    service_name: params.query['resource.labels.service_name']
                }
            }
        }
        env = url.searchParams.get('project')

        //init cache after env is defined
        cache.setKey(`ff-fetch-body-from-request-${env}`)
        await cache.init();

        fetch = await arg('Do you want the Request that belongs the clipboard log?', [
            { name: 'Yes', value: false },
            { name: 'No, select from the list of Services', value: true },
        ])
    } catch (e) {
        log(e)
    }
}
try {
    const json = JSON.parse(clipboardText)
    request = {
        httpRequest: {
            requestUrl: json.httpRequest.requestUrl
        },
        trace: json.trace,
        timestamp: json.timestamp,
        resource: {
            labels: {
                service_name: json.resource.labels.service_name
            }
        }
    }
    env = json.resource.labels.project_id

    //init cache after env is defined
    cache.setKey(`ff-fetch-body-from-request-${env}`)
    await cache.init();

    fetch = await arg('Do you want the Request that belongs the clipboard log?', [
        { name: 'Yes', value: false },
        { name: 'No, select from the list of Services', value: true },
    ])
} catch (e) {
    log(e)
}

if (fetch) {
    // select env
    env = await selectEnv()

    //init cache after env is defined
    cache.setKey(`ff-fetch-body-from-request-${env}`)
    await cache.init();

    // select cloud run service
    const services = await cache.remember('services', async () => {
        const {stdout:cloudRunInstances} = await exec(`${gcloud} run services list --platform=managed --project=${env} --format="json"`)
        return JSON.parse(cloudRunInstances)
    })

    const serviceNames = services.map(instance => instance.metadata.name)

    const serviceName = await arg("Choose a Service", serviceNames)

    //fetch requests from logs, filter with jq to get unique URLs
    const logs = await cache.remember(`logs-${serviceName}`, async () => {
        const {stdout:logs} = await exec(`${gcloud} logging read 'resource.labels.service_name="${serviceName}" AND httpRequest.requestMethod="POST" OR httpRequest.requestMethod="PUT" AND logName:"requests"' --limit=1000 --project=${env} --format="json"`)
        return JSON.parse(logs)
    })

    const requests = logs.map(log => {
        const { httpRequest: { status, requestUrl, requestMethod: method } } = log;
        const url = new URL(requestUrl)
        const dateAgo = dayjs(log.timestamp).fromNow()
        return {
            name: `${method} ${url.pathname} (${status}) ${dateAgo}`,
            value: log
        }
    })
    request = await arg<Request>({
        placeholder: "Choose a Request",
    }, requests)
}

//fetch debug log for request
debugger
const debugLog = await cache.remember(`debug-log-${request.trace}`, async () => {
    debugger;
    const { httpRequest: { requestUrl }, resource: { labels: {service_name}}, timestamp } = request;
    const path = new URL(requestUrl).pathname
    const {stdout:log} = await exec(`${gcloud} logging read 'resource.labels.service_name="${service_name}" AND severity="DEBUG" AND labels.path="${path}" AND timestamp>="${timestamp}"' --limit=1 --project=${env} --format="json"`)
    const response = JSON.parse(log);
    return response.length ? response[0] : null
})

if (!debugLog?.jsonPayload?.body) {
    notify('No debug log found')
    exit()
}

const body = JSON.stringify(debugLog.jsonPayload.body, null, 2)
await clipboard.writeText(body)

notify('Payload copied to clipboard')
