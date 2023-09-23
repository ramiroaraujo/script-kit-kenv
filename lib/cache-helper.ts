import {DB} from "../../../../.kit/types/kit";

type DBHelper = ReturnType<DB> extends Promise<infer T> ? T : never;

const datePresets = {
    "1min": 60000,
    "1h": 3600000,
    "2h": 7200000,
    "3h": 10800000,
    "4h": 14400000,
    "5h": 18000000,
    "6h": 21600000,
    "7h": 25200000,
    "8h": 28800000,
    "9h": 32400000,
    "10h": 36000000,
    "11h": 39600000,
    "12h": 43200000,
    "1d": 86400000,
    "2d": 172800000,
    "3d": 259200000,
    "4d": 345600000,
    "5d": 432000000,
    "6d": 518400000,
    "1w": 604800000,
    "2w": 1209600000,
    "1m": 2592000000,
    "never": 0,
}

type DatePresets = typeof datePresets;

export class CacheHelper {

    private db: DBHelper;
    private isInitialized = false;
    public readonly defaultInvalidate = { name: "Invalidate Cache", value: "invalidate" };

    constructor(private key?: string, private defaultExpires?: number) { }

    setKey(key: string ) {
        this.failIfInit()
        this.key = key;
        return this;
    }

    setDefaultExpires(defaultExpires: number | keyof DatePresets) {
        this.failIfInit()
        this.defaultExpires = typeof defaultExpires === 'number' ? defaultExpires : datePresets[defaultExpires];
        return this;
    }

    async get(path: string) {
        if (!this.isInitialized) {
            await this.init();
        }

        const data = this.db.data.content[path];
        if (data && (this.defaultExpires === 0 || Date.now() - data.expires < this.defaultExpires)) {
            return data.data;
        }
    }

    async store(path: string, data: any, expires: number = this.defaultExpires) {
        if (!this.isInitialized) {
            await this.init();
        }

        this.db.data.content[path] = { expires: expires === 0 ? 0 : Date.now() + expires, data };
        await this.db.write();
    }

    async clear(path?: string) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (path) {
            this.db.data.content[path] = undefined;
        } else {
            this.db.data.content = {};
        }
        await this.db.write();
    }

    async remember(type: string, invoke: Function, expires: number = this.defaultExpires) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.db.data.content[type]?.data &&
            (expires === 0 || Date.now() - this.db.data.content[type]?.expires < expires)) {
            return this.db.data.content[type].data;
        }

        try {
            const data = await invoke();
            this.db.data.content[type] = { expires: expires === 0 ? 0 : Date.now() + expires, data };
            await this.db.write();
            return data;
        } catch (e) {
            log(e)
            notify(e.message);
            exit();
        }
    }

    private async init() {
        this.db = await db(this.key, { content: {} });
        this.isInitialized = true;
    }

    private failIfInit() {
        if (this.isInitialized) {
            throw new Error("CacheHelper already initialized.");
        }
    }
}
