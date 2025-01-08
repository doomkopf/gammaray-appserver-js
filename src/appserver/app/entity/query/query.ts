export function indexListKey(entityType: string, entityAttrName: string): string {
  return `gamidx_${entityType}_${entityAttrName}`
}

const ENTITY_ID_VALUE_SEPARATOR = ">!gam!<"

export function serializeEntityIdAndValue(entityId: string, value: string): string {
  return `${entityId}${ENTITY_ID_VALUE_SEPARATOR}${value}`
}

export function deserializeEntityIdAndValue(str: string): { id: string, value: string } {
  const [id, value] = str.split(ENTITY_ID_VALUE_SEPARATOR)
  return { id, value }
}
