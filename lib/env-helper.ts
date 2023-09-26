export const getEnv = (key: string, defaultValue?: string) => {
  const env = process.env[key];
  if (env === undefined) {
    if (defaultValue !== undefined) return defaultValue;

    const error = `Environment variable ${key} is not defined`;
    notify({ title: error });
    throw new Error(error);
  }
  return env;
};

export const hasEnv = (key: string) => {
  return Object.hasOwn(process.env, key);
};
