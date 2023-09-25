// Name: ff extract test envs

import "@johnlindquist/kit"
import {getFFLocalServices} from "../lib/ff-helper";
import {FFService} from "../lib/ff-service";

const yaml = await npm('yaml')

const folders = await getFFLocalServices();
const serviceName = await arg("Select a service to extract test env variables", folders);

const service = await FFService.init(serviceName)
const testDockerFile = `${service.getPath()}/deployment/test/docker-compose.test.yml`
const content = await readFile(testDockerFile, 'utf-8')

const config = yaml.parse(content)

debugger
const envs = config.services.sut.environment;

const converted = Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

await clipboard.writeText(converted)
notify('Env variables converted and copied to clipboard')
