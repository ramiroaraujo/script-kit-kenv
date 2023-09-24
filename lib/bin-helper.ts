import {getEnv} from "./env-helper";

const commonBinPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
]

export const binPath = async (binName: string) => {
    //check if bin exists in common paths
    for(const path of commonBinPaths) {
        if(await pathExists(`${path}/${binName}`)) {
            return `${path}/${binName}`
        }
    }
    //check in env
    for await (const path of getEnv('PATH').split(':')){
        if(await pathExists(`${path}/${binName}`)) {
            return `${path}/${binName}`
        }
    }
    const error = `Could not find ${binName} in PATH`;
    notify({title: error, message: 'Install it, or add/update the PATH in Kit .env'})
    throw new Error(error)
}