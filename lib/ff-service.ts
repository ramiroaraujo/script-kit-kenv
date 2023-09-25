import {getFFPath} from "./ff-helper";
import * as dotenv from "dotenv";

await npm('jsonwebtoken')

export class FFService {

    private path:string;
    private isNestService:boolean;
    private constructor(private readonly folder:string, base:string, isNest:boolean) {
        this.path = `${base}/${folder}`
        this.isNestService = isNest
    }

    static async init(service:string) {
        const base = await getFFPath()
        const path = `${base}/${service}`
        if (!await isDir(path)) {
            throw new Error(`Could not find ${path}`)
        }
        let isNest = false;

        try {
            let jsonPath = home(`${path}/package.json`);
            let file = await readFile(jsonPath, 'utf-8');
            const packageJson = JSON.parse(file);
            isNest = !!packageJson.dependencies['@nestjs/core'];
        } catch (e) {}

        return new FFService(service, base, isNest)
    }

    isNest() {
        return this.isNestService
    }

    getPath() {
        return this.path
    }

    async getServiceName() {
        const path = `${this.path}/deployment/terraform/terraform.tfvars`;
        const content = await readFile(path, 'utf-8');
        return content.match(/service_name\s*=\s*"(.*)"/)[1]
    }

    async getEnvs() {
        const config = await readFile(home(`${this.path}/config.env`), 'utf-8');
        return dotenv.parse<Record<string, string>>(config)
    }

}