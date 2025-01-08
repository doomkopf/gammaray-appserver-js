import { inject, Lifecycle, scoped } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { generateSessionId } from "../../lib/tools/tools"
import { FuncContext, JsonObject } from "../api/core"
import { LoginResult } from "../api/user"
import { AppserverCluster } from "../AppserverCluster"
import { CCMD_LOGIN_PERSISTENT_LOCAL_CLIENT, LoginPersistentLocalClient } from "../ClusterHandler"
import { ResponseSender } from "../ResponseSender"
import { UserSender } from "../UserSender"
import { UserSessionContainer } from "../UserSessionContainer"
import { PersistentLocalClient } from "../webserver/PersistentLocalClient"
import { WebServer } from "../webserver/WebServer"
import { StatelessFunctions } from "./StatelessFunctions"

@scoped(Lifecycle.ContainerScoped)
export class UserLogin {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    @inject("appId") private readonly appId: string,
    private readonly userSessionContainer: UserSessionContainer,
    private readonly cluster: AppserverCluster,
    private readonly responseSender: ResponseSender,
    private readonly userSender: UserSender,
    private readonly webServer: WebServer,
    private readonly statelessFunctions: StatelessFunctions,
  ) {
    this.log = loggerFactory.createForClass(UserLogin)
  }

  async login(userId: string, loginFinishedFunctionId: string, ctx: FuncContext, customCtx?: JsonObject) {
    const sessionId = generateSessionId()
    this.userSessionContainer.put(sessionId, userId)

    if (ctx.persistentLocalClientId) {
      await this.userSender.logout(userId, this.appId)

      const client = this.webServer.getPersistentLocalClientById(ctx.persistentLocalClientId)
      if (client) {
        this.loginPersistentLocalClient(client, userId, sessionId, loginFinishedFunctionId, ctx, customCtx)
      }
      else {
        if (!ctx.requestId) {
          this.log.log(LogLevel.ERROR, "Tried to login from a context without a requestId")
          return
        }

        const sourceWorker = this.responseSender.getSourceWorker(ctx.requestId)
        if (!sourceWorker) {
          this.log.log(LogLevel.ERROR, "Tried to login from a remote worker but the source worker could't be found")
          return
        }

        const msg: LoginPersistentLocalClient = {
          appId: this.appId,
          userId,
          sessionId,
          loginFinishedFunctionId,
          persistentLocalClientId: ctx.persistentLocalClientId,
          requestId: ctx.requestId,
          requestingUserId: ctx.requestingUserId,
          customCtx,
        }
        this.cluster.sendToNode(sourceWorker.nId, sourceWorker.wId, CCMD_LOGIN_PERSISTENT_LOCAL_CLIENT, msg)
      }
    }
    else {
      this.invokeLoginFinishedFunction({ sessionId, ctx: customCtx }, loginFinishedFunctionId, ctx)
    }
  }

  loginPersistentLocalClient(
    persistentLocalClient: PersistentLocalClient,
    userId: string,
    sessionId: string,
    loginFinishedFunctionId: string,
    ctx: FuncContext,
    customCtx?: JsonObject,
  ): void {
    persistentLocalClient.info = {
      appId: this.appId,
      userId,
    }

    this.userSender.putLocalClient(userId, persistentLocalClient)

    this.invokeLoginFinishedFunction({ sessionId, ctx: customCtx }, loginFinishedFunctionId, ctx)
  }

  private invokeLoginFinishedFunction(loginResult: LoginResult<unknown>, loginFinishedFunctionId: string, ctx: FuncContext) {
    this.statelessFunctions.invoke(loginFinishedFunctionId, loginResult, ctx)
  }
}
