import { EntityFunc, EntityFunctions, FuncContext, FuncVisibility, JsonObject } from "../api/core"
import { Lib } from "../api/lib"

interface CollectContext {
  params: JsonObject
  ids: string[]
  entities: JsonObject[]
}

export type EntityMapper<E> = (id: string, entity: E) => JsonObject
export type CollectFinish = (entities: JsonObject[], params: JsonObject, lib: Lib, ctx: FuncContext) => void

export function collectAndMap(entityFunc: EntityFunctions, entityType: string, ids: string[], collectFunc: string, params: JsonObject, ctx: FuncContext) {
  const p: CollectContext = {
    params,
    ids,
    entities: [],
  }
  entityFunc.invoke(entityType, collectFunc, ids[0], p, ctx)
}

export function createEntityCollector<E>(entityType: string, collectFunc: string, mapper: EntityMapper<E>, collectFinish: CollectFinish): EntityFunc<E, CollectContext> {
  return {
    vis: FuncVisibility.pri,
    func(entity, id, lib, params, ctx) {
      params.entities.push(mapper(id, entity))
      params.ids.splice(0, 1)

      if (params.ids.length === 0) {
        collectFinish(params.entities, params.params, lib, ctx)
        return
      }

      lib.entityFunc.invoke(entityType, collectFunc, params.ids[0], params, ctx)
    },
  }
}
