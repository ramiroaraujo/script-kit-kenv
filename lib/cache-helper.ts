import {DB} from "../../../../.kit/types/kit";

type DBHelper = ReturnType<DB> extends Promise<infer T> ? T : never;

const datePresets = {
    "1h": 3600,
    "2h": 7200,
    "3h": 10800,
    "4h": 14400,
    "5h": 18000,
    "6h": 21600,
    "7h": 25200,
    "8h": 28800,
    "9h": 32400,
    "10h": 36000,
    "11h": 39600,
    "12h": 43200,
    "1d": 86400,
    "2d": 172800,
    "3d": 259200,
    "4d": 345600,
    "5d": 432000,
    "6d": 518400,
    "1w": 604800,
    "2w": 1209600,
    "1m": 2592000,
}
type DatePresets = typeof datePresets;

export class CacheHelper {

    private db: DBHelper;
    private isInitialized = false;
    public readonly defaultInvalidate = { name: "Invalidate Cache", value: "invalidate" };

    constructor(private key?: string, private defaultExpires?: number) { }

    private async init() {
        this.db = await db(this.key, { content: {} });
        this.isInitialized = true;
    }

    private failIfInit() {
        if (this.isInitialized) {
            throw new Error("CacheHelper already initialized.");
        }
    }

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

    async store(type: string, invoke: Function, expires: number = this.defaultExpires) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.db.data.content[type]?.data &&
            Date.now() - this.db.data.content[type]?.expires < expires) {
            return this.db.data.content[type].data;
        }

        try {
            const data = await invoke();
            this.db.data.content[type] = { expires: Date.now() + expires, data };
            await this.db.write();
            return data;
        } catch (e) {
            log(e)
            notify(e.message);
            exit();
        }
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
}
