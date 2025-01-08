import { delay, inject, Lifecycle, scoped } from "tsyringe"
import { generateUuid } from "../../lib/tools/uuid"
import { EntityFunc, EntityId, EntityType, FuncContext, FuncVisibility, JsonObject } from "../api/core"
import {
  ListFunctions as ApiListFunctions,
  ListIterationFinishedFunctionParams,
  ListIterationFunctionParams,
} from "../api/list"
import { LIST_FUNCTIONS_MAX_ELEMENTS_PER_CHUNK, LISTS_ENTITY_TYPE } from "../constants"
import { DEAD_FUNC_CTX } from "./app-constants"
import { EntityFunctions } from "./entity/EntityFunctions"
import { Lib } from "./Lib"

export interface ListChunk {
  list: string[]
  next: string | null
}

export interface AddListElem {
  e: string
}

export const listFuncAdd: EntityFunc<ListChunk, AddListElem> = {
  vis: FuncVisibility.pri,
  func: (entity, id, lib, payload) => {
    if (!entity) {
      entity = {
        list: [],
        next: null,
      }
    }

    if (entity.list.length >= LIST_FUNCTIONS_MAX_ELEMENTS_PER_CHUNK) {
      const nextChunkId = generateUuid()
      const params: ListChunk = { ...entity }
      lib.entityFunc.invoke(LISTS_ENTITY_TYPE, "addNext", nextChunkId, params, DEAD_FUNC_CTX)
      entity.list = []
      entity.next = nextChunkId
    }

    entity.list.push(payload.e)

    return entity
  },
}

interface RemoveListElem {
  e: string
}

const remove: EntityFunc<ListChunk, RemoveListElem> = {
  vis: FuncVisibility.pri,
  func: (entity, id, lib, payload) => {
    if (!entity) {
      return undefined
    }

    const idx = entity.list.indexOf(payload.e)

    if (idx >= 0) {
      entity.list.splice(idx, 1)
      return entity
    }

    if (entity.next) {
      lib.entityFunc.invoke(LISTS_ENTITY_TYPE, "remove", entity.next, payload, DEAD_FUNC_CTX)
    }

    return undefined
  },
}

const addNext: EntityFunc<ListChunk, ListChunk> = {
  vis: FuncVisibility.pri,
  func: (entity, id, lib, payload) => {
    return payload
  },
}

interface ListIterate {
  itId: string
  finId: string
  ctx?: JsonObject
}

const iterate: EntityFunc<ListChunk, ListIterate> = {
  vis: FuncVisibility.pri,
  func: (entity, id, lib, payload, ctx) => {
    if (!entity) {
      const finParams: ListIterationFinishedFunctionParams<unknown> = {
        ctx: payload.ctx,
      };
      (lib as Lib).statelessFunc.invoke(payload.finId, finParams, ctx)
      return
    }

    const params: ListIterationFunctionParams<unknown> = {
      listChunk: entity.list,
      ctx: payload.ctx,
    };
    (lib as Lib).statelessFunc.invoke(payload.itId, params, ctx)

    if (entity.next) {
      lib.entityFunc.invoke(LISTS_ENTITY_TYPE, "iterate", entity.next, payload, ctx)
    }
    else {
      const finParams: ListIterationFinishedFunctionParams<unknown> = {
        ctx: params.ctx,
      };
      (lib as Lib).statelessFunc.invoke(payload.finId, finParams, ctx)
    }
  },
}

const clear: EntityFunc<ListChunk, never> = {
  vis: FuncVisibility.pri,
  func: (entity, id, lib) => {
    if (!entity) {
      return undefined
    }

    if (entity.next) {
      lib.entityFunc.invoke(LISTS_ENTITY_TYPE, "clear", entity.next, {}, DEAD_FUNC_CTX)
    }

    return "delete"
  },
}

export function createListType(): EntityType<ListChunk> {
  return {
    func: {
      add: listFuncAdd,
      remove,
      addNext,
      iterate,
      clear,
    },
    currentVersion: 1,
  }
}

@scoped(Lifecycle.ContainerScoped)
export class ListFunctions implements ApiListFunctions {
  constructor(
    @inject(delay(() => EntityFunctions)) private readonly entityFuncs: EntityFunctions,
  ) {
  }

  add(listId: EntityId, elemToAdd: string): void {
    const params: AddListElem = {
      e: elemToAdd,
    }
    this.entityFuncs.invoke(LISTS_ENTITY_TYPE, "add", listId, params, DEAD_FUNC_CTX)
  }

  remove(listId: EntityId, elemToRemove: string): void {
    const params: RemoveListElem = {
      e: elemToRemove,
    }
    this.entityFuncs.invoke(LISTS_ENTITY_TYPE, "remove", listId, params, DEAD_FUNC_CTX)
  }

  clear(listId: EntityId): void {
    this.entityFuncs.invoke(LISTS_ENTITY_TYPE, "clear", listId, {}, DEAD_FUNC_CTX)
  }

  iterate(listId: EntityId, iterationFunctionId: string, iterationFinishedFunctionId: string, ctx: FuncContext, customCtx?: JsonObject): void {
    const params: ListIterate = {
      itId: iterationFunctionId,
      finId: iterationFinishedFunctionId,
      ctx: customCtx,
    }
    this.entityFuncs.invoke(LISTS_ENTITY_TYPE, "iterate", listId, params, ctx)
  }
}
