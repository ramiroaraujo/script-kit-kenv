export const getEnv = (key: string, errorMessage?:string) => {
    const env = process.env[key]
    if (env === undefined) {
        const title = `Environment variable ${key} is not defined`;
        const message = errorMessage ?? ''
        notify({title, message})
        throw new Error(title)
    }
    return env
}