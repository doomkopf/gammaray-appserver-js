import { inject, Lifecycle, scoped } from "tsyringe"
import { CacheListener } from "../../../lib/cache/Cache"
import { Database } from "../../../lib/db/Database"
import { Logger } from "../../../lib/logging/Logger"
import { LoggerFactory } from "../../../lib/logging/LoggerFactory"
import { LogLevel } from "../../../lib/logging/LogLevel"
import { Executor } from "../../../lib/schedule/Executor"
import { IntervalScheduledTask, Scheduler } from "../../../lib/schedule/Scheduler"
import { entityFullKey, isEntityIdValid } from "../../../lib/tools/tools"
import { EntityFunctions as ApiEntityFunctions, EntityId, FuncContext, JsonObject } from "../../api/core"
import { Config } from "../../Config"
import { EntityRouter } from "../../EntityRouter"
import { ResponseSender } from "../../ResponseSender"
import { sendFuncErrorToPotentialClient } from "../../webserver/message"
import { DEAD_FUNC_CTX } from "../app-constants"
import { Lib } from "../Lib"
import { EntitiesContainer } from "./EntitiesContainer"
import { EntitiesContainers } from "./EntitiesContainers"
import { AppEntity, EntityContainer } from "./EntityContainer"
import { EntityIndexContext, EntityIndexer } from "./query/EntityIndexer"

@scoped(Lifecycle.ContainerScoped)
export class EntityFunctions implements ApiEntityFunctions, CacheListener<EntityContainer> {
  private readonly log: Logger

  // Initialized through late binding
  private lib!: Lib

  private readonly storeTask: IntervalScheduledTask

  private readonly intervalTask: IntervalScheduledTask | null

  constructor(
    loggerFactory: LoggerFactory,
    config: Config,
    @inject("appId") private readonly appId: string,
    private readonly entitiesContainers: EntitiesContainers,
    @inject("db") private readonly db: Database,
    private readonly entityRouter: EntityRouter,
    private readonly entityIndexer: EntityIndexer,
    private readonly responseSender: ResponseSender,
    private readonly scheduler: Scheduler,
    private readonly executor: Executor,
  ) {
    this.log = loggerFactory.createForClass(EntityFunctions)

    entitiesContainers.setCacheListener(this)

    this.storeTask = scheduler.scheduleInterval(() => {
      this.storeDirtyEntities()
    }, config.getNumber("dbStoreFrequencyMillis"))

    let hasIntervalFunc = false
    for (const [, container] of this.entitiesContainers.iterable()) {
      // internal/experimental function that is not supposed to be used by the public yet - it exists, but is not specified in the API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((container.entityType as any).interval) {
        hasIntervalFunc = true
        break
      }
    }
    if (hasIntervalFunc) {
      this.intervalTask = scheduler.scheduleInterval(() => {
        this.intervalEntities()
      }, config.getNumber("entityIntervalFrequencyMillis"))
    }
    else {
      this.intervalTask = null
    }
  }

  lateInit(lib: Lib): void {
    this.lib = lib
  }

  invoke(entityType: string, func: string, entityId: EntityId, payload: JsonObject | null, paramCtx?: FuncContext) {
    this.syncChecks(entityId)
    this.asyncInvoke(entityType, func, entityId, payload, paramCtx)
  }

  private syncChecks(entityId: EntityId) {
    if (!isEntityIdValid(entityId)) {
      throw new Error(`Invalid entityId: ${entityId}`)
    }
  }

  private async asyncInvoke(entityType: string, func: string, entityId: EntityId, payload: JsonObject | null, paramCtx?: FuncContext) {
    const ctx: FuncContext = paramCtx || DEAD_FUNC_CTX

    if (await this.entityRouter.redirectOrLocal(
      this.appId,
      entityType,
      func,
      entityId,
      ctx.requestId,
      ctx.persistentLocalClientId,
      ctx.requestingUserId,
      payload,
    )) {
      return
    }

    this.executor.execute(() => {
      this.execFunc(entityType, func, entityId, payload, ctx)
    })
  }

  private async execFunc(entityType: string, func: string, entityId: string, payload: JsonObject | null, ctx: FuncContext) {
    const start = Date.now()

    const entitiesContainer = this.entitiesContainers.get(entityType)
    if (!entitiesContainer) {
      this.log.log(LogLevel.WARN, `Unknown entity type: ${entityType}`)
      return
    }

    const entityFunc = entitiesContainer.entityType.func[func]
    if (!entityFunc) {
      this.log.log(LogLevel.WARN, `Unknown entity func: ${entityType} -> ${func}`)
      return
    }

    let dbDuration = 0

    try {
      let entityContainer = entitiesContainer.entities.get(entityId)
      if (!entityContainer) {
        const beforeDb = Date.now()
        let loadedEntity = await this.loadEntity(entityFullKey(this.appId, entityType, entityId))
        dbDuration = Date.now() - beforeDb

        const meanwhileLoadedEntityContainer = entitiesContainer.entities.get(entityId)
        if (meanwhileLoadedEntityContainer) {
          if (this.log.isLevel(LogLevel.DEBUG)) {
            this.log.log(LogLevel.DEBUG, `${this.formatEntityFunc(entityType, func, entityId)} has already been loaded meanwhile by another call - using the already loaded one`)
          }
          entityContainer = meanwhileLoadedEntityContainer
        }
        else {
          if (loadedEntity) {
            loadedEntity = entitiesContainer.migrator.migrateEntityIfNecessary(loadedEntity)
            const version = loadedEntity._iv

            if (entitiesContainer.entityType.deserializeEntity) {
              loadedEntity = entitiesContainer.entityType.deserializeEntity(entityId, loadedEntity) as AppEntity
              loadedEntity._iv = version
            }
          }

          entityContainer = { e: loadedEntity, type: entityType, dirty: false }
          entitiesContainer.entities.put(entityId, entityContainer)
        }
      }

      let indexContext: EntityIndexContext | undefined
      if (entityContainer.e) {
        indexContext = this.entityIndexer.beforeEntityFunc(entityContainer.e, entitiesContainer.entityType)
      }

      const entityAction = entityFunc.func(entityContainer.e as never, entityId, this.lib, payload as never, ctx)

      await this.handleEntityAction(
        entityAction,
        entityId,
        entityType,
        entityContainer,
        entitiesContainer,
        indexContext,
      )
    }
    catch (err) {
      this.handleError(entityType, func, entityId, ctx.requestId, err)
    }

    const duration = Date.now() - start
    if (duration > 100) {
      let msg = `Entity func ${this.formatEntityFunc(entityType, func, entityId)} took ${duration}ms`
      if (dbDuration > 0) {
        msg += ` - db get took ${dbDuration}ms`
      }
      this.log.log(LogLevel.WARN, msg)
    }
  }

  private async handleEntityAction(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    action: AppEntity | void | "delete",
    entityId: string,
    entityType: string,
    entityContainer: EntityContainer,
    entitiesContainer: EntitiesContainer<never>,
    indexContext?: EntityIndexContext,
  ) {
    if (typeof (action) === "object") {
      entityContainer.e = action
      entityContainer.dirty = true

      if (entitiesContainer.entityType.index && entityContainer.e) {
        this.entityIndexer.indexEntity(
          entityContainer.e,
          indexContext,
          entitiesContainer.entityType.index,
          entityType,
          entityId,
        )
      }
    }
    else if (action === "delete") {
      entitiesContainer.entities.remove(entityId)
      await this.db.remove(entityFullKey(this.appId, entityType, entityId))
      await this.entityRouter.releaseEntityMapping(this.appId, entityType, entityId)

      if (indexContext && entitiesContainer.entityType.index) {
        this.entityIndexer.deleteEntityIndexes(
          indexContext,
          entitiesContainer.entityType.index,
          entityType,
          entityId,
        )
      }
    }
  }

  private async loadEntity(key: string): Promise<AppEntity | null> {
    const value = await this.db.get(key)
    if (!value) {
      return null
    }

    return JSON.parse(value)
  }

  private async storeDirtyEntities() {
    let count = 0
    for (const [, container] of this.entitiesContainers.iterable()) {
      const promises: Promise<void>[] = []
      container.entities.forEach((entityId, entityContainer) => {
        if (entityContainer.dirty) {
          promises.push(this.storeEntity(entityId, entityContainer, container))
          count++
        }
      })
      await Promise.all(promises)
    }

    if (count > 0) {
      this.log.log(LogLevel.INFO, `Stored ${count} dirty entities`)
    }
  }

  private async storeEntity(entityId: string, entityContainer: EntityContainer, entitiesContainer: EntitiesContainer<never>) {
    if (!entityContainer.e) {
      return
    }

    let entity = entityContainer.e as JsonObject
    if (entitiesContainer.entityType.serializeEntity) {
      try {
        entity = entitiesContainer.entityType.serializeEntity(entityId, entity as never)
      }
      catch (e) {
        this.log.log(LogLevel.ERROR, "", e)
        return
      }
    }

    entityContainer.dirty = false
    await this.db.put(entityFullKey(this.appId, entityContainer.type, entityId), JSON.stringify(entity))
  }

  private intervalEntities() {
    for (const [type, entitiesContainer] of this.entitiesContainers.iterable()) {
      const { entityType } = entitiesContainer
      // internal/experimental function that is not supposed to be used by the public yet - it exists, but is not specified in the API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(entityType as any).interval) {
        continue
      }

      entitiesContainer.entities.forEach((entityId, entityContainer) => {
        // internal/experimental function that is not supposed to be used by the public yet - it exists, but is not specified in the API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (entityContainer.e && (entityType as any).interval) {
          try {
            const indexContext = this.entityIndexer.beforeEntityFunc(entityContainer.e, entityType)

            this.handleEntityAction(
              // internal/experimental function that is not supposed to be used by the public yet - it exists, but is not specified in the API
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (entityType as any).interval(entityContainer.e as never, entityId, this.lib),
              entityId,
              type,
              entityContainer,
              entitiesContainer,
              indexContext,
            )
          }
          catch (e) {
            this.log.log(LogLevel.ERROR, "", e)
          }
        }
      })
    }
  }

  async onEntryEvicted(entityId: string, entityContainer: EntityContainer): Promise<void> {
    const entityTypeContainer = this.entitiesContainers.get(entityContainer.type)
    if (entityTypeContainer) {
      if (entityContainer.dirty) {
        this.storeEntity(entityId, entityContainer, entityTypeContainer)
      }
    }

    await this.entityRouter.releaseEntityMapping(this.appId, entityContainer.type, entityId)
    if (this.log.isLevel(LogLevel.DEBUG)) {
      this.log.log(LogLevel.DEBUG, `Released entity type=${entityContainer.type} entityId=${entityId}`)
    }
  }

  private handleError(entityType: string, func: string, id: string, requestId: string | null, err: Error) {
    this.log.log(LogLevel.ERROR, `Error in entity func: ${this.formatEntityFunc(entityType, func, id)}`, err)
    if (requestId) {
      sendFuncErrorToPotentialClient(this.responseSender, requestId, entityType, func, err.message)
    }
  }

  private formatEntityFunc(type: string, func: string, id: string): string {
    return `${type}.${func}.${id}`
  }

  async shutdown(): Promise<void> {
    if (this.intervalTask) {
      this.scheduler.stopInterval(this.intervalTask)
    }

    this.scheduler.stopInterval(this.storeTask)

    await this.storeDirtyEntities()

    for (const [, entityTypeContainer] of this.entitiesContainers.iterable()) {
      const promises: Promise<void>[] = []
      entityTypeContainer.entities.forEach((entityId, entityContainer) => {
        promises.push(this.entityRouter.releaseEntityMapping(this.appId, entityContainer.type, entityId))
      })
      await Promise.all(promises)
    }

    this.entitiesContainers.shutdown()
  }
}
