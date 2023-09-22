import {DB} from "../../../../.kit/types/kit";

type DBHelper = ReturnType<DB> extends Promise<infer T> ? T : never;

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

    setDefaultExpires(defaultExpires: number) {
        this.failIfInit()
        this.defaultExpires = defaultExpires;
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
