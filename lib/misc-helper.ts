export const assertValue = <T>(value: T, message?: string): T => {
  if (!value) {
    throw new Error(message || 'Value is undefined');
  }
  return value;
};
