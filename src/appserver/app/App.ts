import { inject, Lifecycle, scoped } from "tsyringe"
import { EntityId, FuncVisibility, GammarayApp, JsonObject } from "../api/core"
import { FuncContextImpl } from "../FuncContextImpl"
import { ResponseSender } from "../ResponseSender"
import { NetStatusCode } from "../webserver/message"
import { AppShutdown } from "./app-shutdown"
import { EntitiesContainers, EntityMetrics } from "./entity/EntitiesContainers"
import { EntityFunctions } from "./entity/EntityFunctions"
import { Openapi } from "./Openapi"
import { RestMapping } from "./RestMapping"
import { StatelessFunctions } from "./StatelessFunctions"
import { UserLogin } from "./UserLogin"

export interface AppMetrics {
  entityMetrics: EntityMetrics;
}

@scoped(Lifecycle.ContainerScoped)
export class App {
  constructor(
    @inject("appRoot") private readonly appRoot: GammarayApp,
    private readonly responseSender: ResponseSender,
    private readonly statelessFunctions: StatelessFunctions,
    private readonly entityFunctions: EntityFunctions,
    private readonly entitiesContainers: EntitiesContainers,
    readonly userLogin: UserLogin,
    readonly restMapping: RestMapping,
    readonly openapi: Openapi,
    private readonly appShutdown: AppShutdown,
  ) {
  }

  isPublicFunc(func: string, entityType?: string): boolean {
    if (entityType) {
      const type = this.appRoot.entity[entityType]
      if (!type) {
        return false
      }

      const theFunc = type.func[func]
      if (!theFunc) {
        return false
      }
      return theFunc.vis === FuncVisibility.pub
    }

    const theFunc = this.appRoot.func[func]
    if (!theFunc) {
      return false
    }
    return theFunc.vis === FuncVisibility.pub
  }

  handleFunc(
    requestId: string | null,
    persistentLocalClientId: string | null,
    requestingUserId: string | null,
    func: string,
    entityType: string | null,
    entityId: EntityId | null,
    payload: JsonObject | null,
  ): void {
    const ctx = new FuncContextImpl(
      requestId,
      persistentLocalClientId,
      requestingUserId,
      this.responseSender,
    )
    if (entityType) {
      if (!entityId) {
        if (requestId) {
          const status: NetStatusCode = "invalidFunc"
          this.responseSender.send(requestId, { status })
        }
        return
      }

      this.entityFunctions.invoke(entityType, func, entityId, payload, ctx)
    }
    else {
      this.statelessFunctions.invoke(func, payload, ctx)
    }
  }

  onUserLoggedOut(userId: string): void {
    this.statelessFunctions.onUserLoggedOut(userId)
  }

  retrieveAppMetrics(): AppMetrics {
    return {
      entityMetrics: this.entitiesContainers.retrieveEntityTypeMetrics(),
    }
  }

  async shutdown(): Promise<void> {
    await this.appShutdown.shutdown()
  }
}
