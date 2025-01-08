import { inject, Lifecycle, scoped } from "tsyringe"
import { Lib as ApiLib } from "../api/lib"
import { UserFunctions } from "../api/user"
import { AppTools } from "../AppTools"
import { ResponseSender } from "../ResponseSender"
import { UserSender } from "../UserSender"
import { AdminTools } from "./AdminTools"
import { AppLogger } from "./AppLogger"
import { BigObjects } from "./BigObjects"
import { EntityFunctions } from "./entity/EntityFunctions"
import { EntityQueries } from "./entity/query/EntityQueries"
import { HttpClient } from "./HttpClient"
import { ListFunctions } from "./ListFunctions"
import { StatelessFunctions } from "./StatelessFunctions"
import { UserLogin } from "./UserLogin"

@scoped(Lifecycle.ContainerScoped)
export class Lib implements ApiLib {
  readonly user: UserFunctions

  constructor(
    @inject("appId") appId: string,
    readonly responseSender: ResponseSender,
    userSender: UserSender,
    userLogin: UserLogin,
    readonly tools: AppTools,
    readonly entityFunc: EntityFunctions,
    readonly listFunc: ListFunctions,
    readonly entityQueries: EntityQueries,
    readonly httpClient: HttpClient,
    readonly log: AppLogger,
    readonly bigObjects: BigObjects,
    readonly statelessFunc: StatelessFunctions,
    readonly admin: AdminTools,
  ) {
    this.user = {
      send(userId, obj) {
        userSender.send(userId, obj)
      },
      login(userId, loginFinishedFunctionId, ctx, customCtx) {
        userLogin.login(userId, loginFinishedFunctionId, ctx, customCtx)
      },
      logout(userId) {
        userSender.logout(userId, appId)
      },
    }
  }
}
