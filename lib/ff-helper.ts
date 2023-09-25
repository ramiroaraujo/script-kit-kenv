import {getEnv, hasEnv} from "./env-helper";

export const selectEnv = async (withoutPro = false) => {

    const envs = [
        'ff-app-dev',
        'ff-app-iso-1',
        'ff-app-iso-2',
        'ff-app-iso-3',
        'ff-app-iso-4',
        'ff-app-e2e',
    ]
    if (!withoutPro) {
        envs.unshift('ff-app-prod')
    }

    return await arg("Choose an environment", envs)
}

export const getFFLocalServices = async (nestOnly = true) => {
    const ffPath = await getFFPath()
    const allFolders = (await exec(`cd ${ffPath} && ls -d */`)).all
        .split('\n')
        .map(folder => folder.replace('/', ''));

    let folders = allFolders;
    if (nestOnly) {
        const validFolders = allFolders.map(async folder => {
            try {
                let path = home(`FactoryFix/${folder}/package.json`);
                const file = await readFile(path, 'utf-8');
                const packageJson = JSON.parse(file);

                return packageJson.dependencies['@nestjs/core'] ? folder : null;
            } catch (e) {
                return null;
            }
        });
        folders = (await Promise.all(validFolders)).filter(Boolean);
    }
    
    return await arg("Select a folder to inject the debug config", folders);
}

export const getFFPath = async () => {
    if (hasEnv('FF_PATH')) {
        const env = getEnv('FF_PATH');
        if (await isDir(env)) {
            return env
        }
    }
    const defaultPath = home('FactoryFix');
    if (await isDir(defaultPath)) {
        return defaultPath
    }

    const error = `Could not find FF_PATH in .env or ${defaultPath} does not exist`;
    notify({title: 'Could not find FactoryFix directory', message:error})
    throw new Error(error)
}
