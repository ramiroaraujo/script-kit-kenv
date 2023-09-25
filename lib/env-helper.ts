export const getEnv = (key: string, errorMessage?:string) => {
    const env = process.env[key]
    if (env === undefined) {
        const error = `Environment variable ${key} is not defined`;
        const message = errorMessage ?? ''
        notify({title: error, message})
        throw new Error(error)
    }
    return env
}

export const hasEnv = (key: string) => {
    return Object.hasOwn(process.env, key)
}