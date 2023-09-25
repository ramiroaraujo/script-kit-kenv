// Name: ff Fetch Body from Request

import "@johnlindquist/kit"
import {selectEnv} from "../lib/ff-helper";
import {CacheHelper} from "../lib/cache-helper";
import {binPath} from "../lib/bin-helper";
import relativeTime from "dayjs/plugin/relativeTime.js";

const dayjs = await npm('dayjs')
dayjs.extend(relativeTime);

const gcloud = await binPath('gcloud')

// select env
const env = await selectEnv()

const cache = new CacheHelper(`ff-fetch-body-from-request-${env}`, '1w');
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
const request = await arg<any>({
    placeholder: "Choose a Request",

}, requests)

//fetch debug log for request
const debugLog = await cache.remember(`debug-log-${request.trace}`, async () => {
    const { httpRequest: { requestUrl } } = request;
    const path = new URL(requestUrl).pathname
    const timestamp = request.timestamp
    const {stdout:log} = await exec(`${gcloud} logging read 'resource.labels.service_name="${serviceName}" AND severity="DEBUG" AND labels.path="${path}" AND timestamp>="${timestamp}"' --limit=1 --project=${env} --format="json"`)
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
