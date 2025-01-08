import { Lifecycle, scoped } from "tsyringe"
import { EntityType, JsonObject } from "../../../api/core"
import { EntityIndexing } from "../../../api/query"
import { ListFunctions } from "../../ListFunctions"
import { indexListKey, serializeEntityIdAndValue } from "./query"

export interface EntityIndexContext {
  oldAttributeValues: Record<string, string>
}

@scoped(Lifecycle.ContainerScoped)
export class EntityIndexer {
  constructor(
    private readonly listFuncs: ListFunctions,
  ) {
  }

  beforeEntityFunc(entity: JsonObject, entityType: EntityType<never>): EntityIndexContext | undefined {
    if (!entity || !entityType.index) {
      return undefined
    }

    const attributes = this.parseTopLevelPrimitiveAttributeNames(entity)
    const oldAttributeValues: Record<string, string> = {}
    for (const attr of attributes) {
      oldAttributeValues[attr] = entity[attr]
    }

    return { oldAttributeValues }
  }

  indexEntity(entity: JsonObject, ctx: EntityIndexContext | undefined, entityIndexing: EntityIndexing, entityTypeName: string, entityId: string): void {
    if (entityIndexing.mode === "SIMPLE") {
      const attributes = this.parseTopLevelPrimitiveAttributeNames(entity)
      for (const attr of attributes) {
        const oldValue = ctx ? ctx.oldAttributeValues[attr] : null
        const value = String(entity[attr])
        if (oldValue !== value) {
          const key = indexListKey(entityTypeName, attr)
          if (oldValue) {
            this.listFuncs.remove(key, serializeEntityIdAndValue(entityId, oldValue))
          }
          this.listFuncs.add(key, serializeEntityIdAndValue(entityId, value))
        }
      }
    }
  }

  deleteEntityIndexes(ctx: EntityIndexContext, entityIndexing: EntityIndexing, entityTypeName: string, entityId: string): void {
    if (entityIndexing.mode === "SIMPLE") {
      for (const attr in ctx.oldAttributeValues) {
        const value = ctx.oldAttributeValues[attr]
        this.listFuncs.remove(indexListKey(entityTypeName, attr), serializeEntityIdAndValue(entityId, value))
      }
    }
  }

  private parseTopLevelPrimitiveAttributeNames(entity: JsonObject): string[] {
    const keys = Object.keys(entity)
    const attributes: string[] = []

    for (const key of keys) {
      const typeOfAttr = typeof (entity[key])
      if (typeOfAttr === "string"
        || typeOfAttr === "number"
        || typeOfAttr === "boolean"
      ) {
        attributes.push(key)
      }
    }

    return attributes
  }
}
