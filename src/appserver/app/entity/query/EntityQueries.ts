import { inject, Lifecycle, scoped } from "tsyringe"
import { arrayRemove } from "../../../../lib/tools/tools"
import { FuncContext, FuncVisibility, GammarayApp, JsonObject, StatelessFunc } from "../../../api/core"
import { ListIterationFinishedFunctionParams, ListIterationFunctionParams } from "../../../api/list"
import { EntityQueries as ApiEntityQueries, EntityQuery, EntityQueryFinishedFunctionParams } from "../../../api/query"
import { Lib } from "../../Lib"
import { ListFunctions } from "../../ListFunctions"
import { deserializeEntityIdAndValue, indexListKey } from "./query"

const INDEX_LIST_ITERATION_FUNC = "gamEntityQueryIterate"
const INDEX_LIST_ITERATION_FIN_FUNC = "gamEntityQueryIterateFin"

@scoped(Lifecycle.ContainerScoped)
export class EntityQueries implements ApiEntityQueries {
  constructor(
    private readonly listFuncs: ListFunctions,
    @inject("appRoot") appRoot: GammarayApp,
  ) {
    appRoot.func[INDEX_LIST_ITERATION_FUNC] = iterate
    appRoot.func[INDEX_LIST_ITERATION_FIN_FUNC] = iterateFin
  }

  query(entityType: string, queryFinishedFunctionId: string, query: EntityQuery, ctx: FuncContext, customCtx?: JsonObject) {
    if (!query.attributes.length) {
      throw new Error("At least one attribute is necessary for a query")
    }

    const iterationContext: IterationContext = {
      ctx: customCtx,
      qFinFuncId: queryFinishedFunctionId,
      entityType,
      query,
      attrIdx: 0,
      ids: [],
    }
    const [firstAttr] = query.attributes
    this.listFuncs.iterate(
      indexListKey(entityType, firstAttr.name),
      INDEX_LIST_ITERATION_FUNC,
      INDEX_LIST_ITERATION_FIN_FUNC,
      ctx,
      iterationContext,
    )
  }
}

interface IterationContext {
  ctx?: JsonObject
  qFinFuncId: string
  entityType: string
  query: EntityQuery
  attrIdx: number
  ids: string[]
}

function matchCase(itCtx: IterationContext, ids: string[], idAndValue: { id: string, value: string }) {
  if (itCtx.attrIdx === 0) {
    ids.push(idAndValue.id)
  }
}

function noMatchCase(itCtx: IterationContext, ids: string[], idAndValue: { id: string, value: string }) {
  if (itCtx.attrIdx > 0) {
    arrayRemove(ids, idAndValue.id)
  }
}

const iterate: StatelessFunc<ListIterationFunctionParams<unknown>> = {
  vis: FuncVisibility.pri,
  func(lib, params) {
    const itCtx = params.ctx as IterationContext
    const { ids } = itCtx
    const attr = itCtx.query.attributes[itCtx.attrIdx]

    params.listChunk.forEach(elem => {
      const idAndValue = deserializeEntityIdAndValue(elem)
      if (attr.value.match !== undefined) {
        if (idAndValue.value == attr.value.match) {
          matchCase(itCtx, ids, idAndValue)
        }
        else {
          noMatchCase(itCtx, ids, idAndValue)
        }
      }
      else if (attr.value.range) {
        const n = Number(idAndValue.value)
        const { min, max } = attr.value.range

        if (min !== undefined && max !== undefined) {
          if (n >= min && n <= max) {
            matchCase(itCtx, ids, idAndValue)
          }
          else {
            noMatchCase(itCtx, ids, idAndValue)
          }
        }
        else if (min !== undefined) {
          if (n >= min) {
            matchCase(itCtx, ids, idAndValue)
          }
          else {
            noMatchCase(itCtx, ids, idAndValue)
          }
        }
        else if (max !== undefined) {
          if (max <= n) {
            matchCase(itCtx, ids, idAndValue)
          }
          else {
            noMatchCase(itCtx, ids, idAndValue)
          }
        }
      }
    })
  },
}

const iterateFin: StatelessFunc<ListIterationFinishedFunctionParams<unknown>> = {
  vis: FuncVisibility.pri,
  func(lib, params, ctx) {
    const itCtx = params.ctx as IterationContext

    if (itCtx.attrIdx + 1 < itCtx.query.attributes.length) {
      itCtx.attrIdx++
      const nextAttr = itCtx.query.attributes[itCtx.attrIdx]
      lib.listFunc.iterate(
        indexListKey(itCtx.entityType, nextAttr.name),
        INDEX_LIST_ITERATION_FUNC,
        INDEX_LIST_ITERATION_FIN_FUNC,
        ctx,
        itCtx,
      )
      return
    }

    const p: EntityQueryFinishedFunctionParams<unknown> = {
      ctx: itCtx.ctx,
      ids: itCtx.ids,
    };
    (lib as Lib).statelessFunc.invoke(itCtx.qFinFuncId, p, ctx)
  },
}
