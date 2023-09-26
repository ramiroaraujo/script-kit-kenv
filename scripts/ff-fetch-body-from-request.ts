// Name: FF Fetch Body from Request

import '@johnlindquist/kit';
import { selectEnv } from '../lib/ff-helper';
import { CacheHelper } from '../lib/cache-helper';
import { binPath } from '../lib/bin-helper';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { assertKeyValue, assertValue } from '../lib/misc-helper';

const dayjs = await npm('dayjs');
dayjs.extend(relativeTime);

type Request = {
  httpRequest: {
    requestUrl: string;
  };
  resource: {
    labels: {
      service_name: string;
    };
  };
  timestamp: string;
  trace: string;
};

type Params = { [key: string]: string } & { query: object };

const gcloud = await binPath('gcloud');

//don't init cache yet, we don't know the env
const cache = new CacheHelper().setDefaultExpires('1w');

//default to fetch
let fetch = true;

let request: Request;
let env: string;

const clipboardText = await clipboard.readText();

if (clipboardText.startsWith('https://console.cloud.google.com/logs/query')) {
  try {
    const url = new URL(clipboardText);
    //parse the URL to get the query params
    const params = url.pathname
      .substring('/logs/query;'.length)
      .split(';')
      .map((pair) => pair.split('='))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: decodeURIComponent(value) }), {} as Params);
    //parse the query params to get the query
    params.query = (params.query as unknown as string)
      .split('\n')
      .map((line) => line.trim().split('='))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value.replace(/^"?([^"]+)"?$/, '$1') }), {});
    request = {
      httpRequest: {
        requestUrl: assertKeyValue<string>(params.query, 'httpRequest.requestUrl'),
      },

      trace: assertKeyValue<string>(params.query, 'insertId'),
      timestamp: assertKeyValue<string>(params.query, 'timestamp'),
      resource: {
        labels: {
          service_name: assertKeyValue<string>(params.query, 'resource.labels.service_name'),
        },
      },
    };
    env = assertValue<string>(url.searchParams.get('project'), 'Project is undefined');

    //init cache after env is defined
    cache.setKey(`ff-fetch-body-from-request-${env}`);
    await cache.init();

    fetch = await arg('Do you want the Request that belongs the clipboard log?', [
      { name: 'Yes', value: false },
      { name: 'No, select from the list of Services', value: true },
    ]);
  } catch (e) {
    log(e);
    notify({
      title: 'Clipboard is not a valid log URL',
      message: 'Reverting to fetch from the services list',
    });
  }
} else if (clipboardText.startsWith('{')) {
  try {
    const json = JSON.parse(clipboardText);
    request = {
      httpRequest: {
        requestUrl: assertValue<string>(json.httpRequest.requestUrl),
      },
      trace: assertValue<string>(json.trace),
      timestamp: assertValue<string>(json.timestamp),
      resource: {
        labels: {
          service_name: assertValue<string>(json.resource.labels.service_name),
        },
      },
    };
    env = assertValue<string>(json.resource.labels.project_id);

    //init cache after env is defined
    cache.setKey(`ff-fetch-body-from-request-${env}`);
    await cache.init();

    fetch = await arg('Do you want the Request that belongs the clipboard log?', [
      { name: 'Yes', value: false },
      { name: 'No, select from the list of Services', value: true },
    ]);
  } catch (e) {
    //don't even log or notify if it's not a valid JSON
    if (!(e instanceof SyntaxError)) {
      log(e);
      notify({
        title: 'Clipboard is not a valid JSON payload',
        message: 'Reverting to fetch from the services list',
      });
    }
  }
}

if (fetch) {
  // select env
  env = await selectEnv();

  //init cache after env is defined
  cache.setKey(`ff-fetch-body-from-request-${env}`);
  await cache.init();

  // select cloud run service
  const services = await cache.remember('services', async () => {
    const { stdout: cloudRunInstances } = await exec(
      `${gcloud} run services list --platform=managed --project=${env} --format="json"`,
    );
    return JSON.parse(cloudRunInstances);
  });

  const serviceNames = services.map((instance) => instance.metadata.name);

  const serviceName = await arg('Choose a Service', serviceNames);

  //fetch requests from logs, filter with jq to get unique URLs
  const logs = await cache.remember(`logs-${serviceName}`, async () => {
    const { stdout: logs } = await exec(
      `${gcloud} logging read 'resource.labels.service_name="${serviceName}"
      AND httpRequest.requestMethod="POST" OR httpRequest.requestMethod="PUT"
      AND logName:"requests"' \
      --limit=1000 \
      --project=${env} \
      --format="json"`,
    );
    return JSON.parse(logs);
  });

  const requests = logs.map((log) => {
    const {
      httpRequest: { status, requestUrl, requestMethod: method },
    } = log;
    const url = new URL(requestUrl);
    const dateAgo = dayjs(log.timestamp).fromNow();
    return {
      name: `${method} ${url.pathname} (${status}) ${dateAgo}`,
      value: log,
    };
  });
  request = await arg<Request>(
    {
      placeholder: 'Choose a Request',
    },
    requests,
  );
}

//fetch debug log for request
const debugLog = await cache.remember(`debug-log-${request.trace}`, async () => {
  const {
    httpRequest: { requestUrl },
    resource: {
      labels: { service_name },
    },
    timestamp,
  } = request;
  const path = new URL(requestUrl).pathname;
  const { stdout: log } = await exec(
    `${gcloud} logging read 'resource.labels.service_name="${service_name}"
    AND severity="DEBUG"
    AND labels.path="${path}"
    AND timestamp>="${timestamp}"' \
    --order=asc \
    --limit=1 \
    --project=${env} \
    --format="json"`,
  );
  const response = JSON.parse(log);
  return response.length ? response[0] : null;
});

if (!debugLog?.jsonPayload?.body) {
  notify('No debug log found');
  exit();
}

const body = debugLog.jsonPayload.body;
// if it's a pubsub, ask if they want to copy the decoded data or the raw payload
if (body?.message?.data && body?.subscription) {
  const operation = await arg('The payload is a PubSub event. Do you want to:', [
    {
      name: 'Copy payload to clipboard',
      description: 'Ready to paste as payload in a POST request',
      value: 'copy',
    },
    {
      name: 'Copy the base64 decoded data to clipboard',
      description: 'Useful for modifying the data',
      value: 'copy-decoded',
    },
  ]);

  if (operation === 'copy-decoded') {
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf8');
    const pretty = JSON.stringify(JSON.parse(decoded), null, 2);
    await clipboard.writeText(pretty);
    notify('Decoded payload message copied to clipboard');
    exit();
  }
}

const json = JSON.stringify(body, null, 2);
await clipboard.writeText(json);

notify('Payload copied to clipboard');
