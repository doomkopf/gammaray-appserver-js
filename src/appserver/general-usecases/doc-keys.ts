export function appScriptKey(appId: string): string {
  return `${appId}_appscript`
}

export function bigObjectIdsListKey(appId: string): string {
  return `${appId}_bobjids`
}

export function bigObjectKey(appId: string, id: string): string {
  return `${appId}_bobj_${id}`
}
