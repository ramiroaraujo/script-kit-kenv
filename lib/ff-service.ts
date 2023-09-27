import { getFFPath } from './ff-helper';
import * as dotenv from 'dotenv';
import * as yaml from 'yaml';

await npm('jsonwebtoken');
await npm('yaml');

export class FFService {
  private path: string;
  private isNestService: boolean;

  private constructor(
    private readonly folder: string,
    base: string,
    isNest: boolean,
  ) {
    this.path = `${base}/${folder}`;
    this.isNestService = isNest;
  }

  static async init(service: string) {
    const base = await getFFPath();
    const path = `${base}/${service}`;
    if (!(await isDir(path))) {
      throw new Error(`Could not find ${path}`);
    }
    let isNest: boolean;

    try {
      const jsonPath = home(`${path}/package.json`);
      const file = await readFile(jsonPath, 'utf-8');
      const packageJson = JSON.parse(file);
      isNest = !!packageJson.dependencies['@nestjs/core'];
    } catch (e) {
      isNest = false;
    }

    return new FFService(service, base, isNest);
  }

  isNest() {
    return this.isNestService;
  }

  getPath() {
    return this.path;
  }

  async getServiceName() {
    const path = `${this.path}/deployment/terraform/terraform.tfvars`;
    const content = await readFile(path, 'utf-8');
    return content.match(/service_name\s*=\s*"(.*)"/)[1];
  }

  async getServicePort() {
    const dockerComposeFile = `${this.path}/docker-compose.yml`;
    const content = await readFile(dockerComposeFile, 'utf-8');
    const dockerCompose = yaml.parse(content);
    const serviceName = await this.getServiceName();
    const ports =
      dockerCompose.services[serviceName]?.ports ??
      dockerCompose.services[Object.keys(dockerCompose.services)[0]]?.ports;
    const port = ports
      .find((port) => {
        return port.match(/.*:8080$/);
      })
      ?.replace(/^(\d+):8080$/, '$1');
    return Number(port);
  }

  async getEnvs() {
    const config = await readFile(home(`${this.path}/config.env`), 'utf-8');
    return dotenv.parse<Record<string, string>>(config);
  }
  async getTestEnvs(): Promise<Record<string, string>> {
    const testDockerFile = `${this.path}/deployment/test/docker-compose.test.yml`;
    const content = await readFile(testDockerFile, 'utf-8');
    const config = yaml.parse(content);
    return config?.services?.sut?.environment || {};
  }
}
