// Name: ff extract test envs

import "@johnlindquist/kit"
import {getFFLocalServices} from "../lib/ff-helper";
import {FFService} from "../lib/ff-service";

const folders = await getFFLocalServices();
const serviceName = await arg("Select a service to extract test env variables", folders);

const service = await FFService.init(serviceName)
const envs = await service.getTestEnvs()

const converted = Object.entries(envs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

await clipboard.writeText(converted)
notify('Env variables converted and copied to clipboard')
