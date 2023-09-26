import { getEnv } from './env-helper';
import { FFService } from './ff-service';

export const selectEnv = async (withoutPro = false) => {
  const envs = [
    'ff-app-dev',
    'ff-app-iso-1',
    'ff-app-iso-2',
    'ff-app-iso-3',
    'ff-app-iso-4',
    'ff-app-e2e',
  ];
  if (!withoutPro) {
    envs.unshift('ff-app-prod');
  }

  return await arg('Choose an environment', envs);
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
  return folders;
};

export const getFFPath = async (): Promise<string> => {
  const env = getEnv('FF_PATH');
  if (await isDir(env)) {
    return env;
  }

  const error = `Could not find FF_PATH in .env`;
  notify({ title: 'Could not find the projects directory', message: error });
  throw new Error(error);
};
