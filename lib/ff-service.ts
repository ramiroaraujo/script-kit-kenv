import {getFFPath} from "./ff-helper";
import {config} from "dotenv";

export class FFService {

    private path:string;
    private isNestService:boolean;
    private constructor(private readonly service:string, base:string, isNest:boolean) {
        this.path = `${base}/${service}`
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

    get isNest() {
        return this.isNestService
    }
}