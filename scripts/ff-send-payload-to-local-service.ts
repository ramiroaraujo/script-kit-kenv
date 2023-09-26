// Name: ff send payload to local service

import '@johnlindquist/kit';
import { getFFLocalServices } from '../lib/ff-helper';
import { FFService } from '../lib/ff-service';

const folders = await getFFLocalServices();
const serviceName = await arg('Select a service', folders);
const service = await FFService.init(serviceName);
const port = await service.getServicePort();
const baseUrl = `http://localhost:${port}`;

//check if service is running
try {
  await get(baseUrl, { validateStatus: () => true });
} catch (e) {
  notify({ title: 'Service is not running', message: 'Start the service and try again' });
  exit();
}

//load all files
const { stdout: files } = await exec(
  `find "${service.getPath()}/src" -type f -name "*controller.ts"`,
);
const controllers = await Promise.all(
  files
    .split('\n')
    .filter(Boolean)
    .map((file) => {
      return readFile(file, 'utf-8');
    }),
);

const endpoints = controllers
  .map((controller) => {
    const base = controller.match(/@Controller\('(.*)'\)/)?.[1] ?? '';
    const methods = controller.matchAll(/@(Post|Put)\('?(.*?)'?\)/g);
    //@todo test (and fix?) for methods without a path name, not uncommon
    //@todo check for named parameters in the path, maybe forms to handle those? :(
    return [...methods].map(([, method, path]) => {
      return { method, path: `${base}/${path}` };
    });
  })
  .flat();

const endpoint = await arg(
  `Select an endpoint to hit in ${serviceName}`,
  endpoints.map((e) => ({
    name: `${e.method} ${e.path}`,
    value: e,
  })),
);

// use clipboard as payload if it's a valid json
let payload = await clipboard.readText();
try {
  const data = JSON.parse(payload);
  //plain numbers are valid json, we're only interested in objects
  if (typeof data !== 'object') {
    throw new Error();
  }
} catch (e) {
  payload = '{\n\t\n}';
}
const url = `${baseUrl}/${endpoint.path}`;

// editor to add / edit the JSON payload
await editor({
  name: `Send payload to ${url}`,
  value: payload,
  language: 'json',
  onSubmit: async (payload) => {
    const method = endpoint.method === 'Post' ? post : put;
    const { status, data } = await method(url, payload, {
      headers: { 'content-type': 'application/json' },
      validateStatus: () => true,
    });
    if (status >= 400) {
      const message =
        status === 403
          ? 'Try to disable HeaderAuthGuard if applicable'
          : 'Check the console for more info';
      notify({ title: `Service Error ${status}`, message });
    } else {
      notify({ title: `Call successful (${status})`, message: 'Check the console for more info' });
    }
    if (data) {
      let response: string;
      try {
        response = JSON.stringify(JSON.parse(data), null, 2);
      } catch (e) {
        response = data;
      }
      if (data.length) {
        await div(md(response));
      }
    }
  },
});
