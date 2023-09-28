import { getEnv } from './env-helper';
import { FFService } from './ff-service';
import * as fs from 'fs';

export const environments = {
  dev: 'ff-app-dev',
  iso1: 'ff-app-iso-1',
  iso2: 'ff-app-iso-2',
  iso3: 'ff-app-iso-3',
  iso4: 'ff-app-iso-4',
  e2e: 'ff-app-e2e',
  prod: 'ff-app-prod',
};

type FFEnv = keyof typeof environments;

export const selectEnv = async (withoutPro = false) => {
  let envs = Object.values(environments);
  if (withoutPro) {
    envs = envs.filter((env) => env !== environments.prod);
  }

  return await arg<FFEnv>('Choose an environment', envs);
};

export const getFFLocalServices = async (nestOnly = true) => {
  const ffPath = await getFFPath();
  const allFolders = (await exec(`cd ${ffPath} && ls -d */`)).all
    .split('\n')
    .map((folder) => folder.replace('/', ''));

  let folders = allFolders;
  if (nestOnly) {
    const validFolders = allFolders.map(async (folder) => {
      try {
        const service = await FFService.init(folder);
        return service.isNest() ? folder : null;
      } catch (e) {
        return null;
      }
    });
    folders = (await Promise.all(validFolders)).filter(Boolean);
  }
  return folders as string[];
};

export const getFFPath = () => {
  const env = getEnv('FF_PATH');
  if (fs.existsSync(env)) {
    return env;
  }

  const error = `Could not find FF_PATH in .env`;
  notify({ title: 'Could not find the projects directory', message: error });
  throw new Error(error);
};
