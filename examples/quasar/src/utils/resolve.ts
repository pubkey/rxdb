export type QueryParam = string | Record<string, string> | undefined
export function resolveBoolean (value: QueryParam) {
  if (!value) {
    return;
  }
  if (typeof value === 'string') {
    return value === 'true';
  }
  const keys = Object.keys(value)
  return keys.reduce((res, key) => {
    res[key] = value[key] === 'true'
    return res;
  }, {} as Record<string, boolean>)
}

export function resolveInt (value: QueryParam) {
  if (!value) {
    return;
  }
  if (typeof value === 'string') {
    return parseInt(value);
  }
  const keys = Object.keys(value)
  return keys.reduce((res, key) => {
    res[key] = parseInt(value[key])
    return res;
  }, {} as Record<string, number>)
}