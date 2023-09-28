import { getEnv } from './env-helper';
import * as fs from 'fs';

const commonBinPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];

export const binPath = (binName: string) => {
  //check if bin exists in common paths
  for (const path of commonBinPaths) {
    if (fs.existsSync(`${path}/${binName}`)) {
      return `${path}/${binName}`;
    }
  }
  //check in env
  for (const path of getEnv('PATH').split(':')) {
    if (fs.existsSync(`${path}/${binName}`)) {
      return `${path}/${binName}`;
    }
  }
  const error = `Could not find ${binName} in PATH`;
  notify({ title: error, message: 'Install it, or add/update the PATH in Kit .env' });
  throw new Error(error);
};
