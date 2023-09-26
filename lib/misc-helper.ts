export const assertValue = <T>(value: T, message?: string): T => {
  if (!value) {
    throw new Error(message || 'Value is undefined');
  }
  return value;
};

export const assertKeyValue = <T>(obj: unknown, key: string, message?: string): T => {
  const value = obj[key];
  if (!value) {
    throw new Error(message || `${key} is undefined`);
  }
  return value;
};
