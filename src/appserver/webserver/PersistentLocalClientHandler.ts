import { singleton } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Config } from "../Config"
import { handlePromiseCatch } from "../gammaray-tools"
import { RequestHandler } from "../RequestHandler"
import { UserSender } from "../UserSender"
import { UserSessionContainer } from "../UserSessionContainer"
import { DDOSManager } from "./DDOSManager"
import { PersistentLocalClientListener } from "./http"
import { parseRequestFromPayload, sendGenericResponse } from "./message"
import { PersistentLocalClient } from "./PersistentLocalClient"

@singleton()
export class PersistentLocalClientHandler implements PersistentLocalClientListener {
  private readonly log: Logger
  private readonly logPayload: boolean

  constructor(
    loggerFactory: LoggerFactory,
    config: Config,
    private readonly ddosManager: DDOSManager,
    private readonly userSender: UserSender,
    private readonly userSessionContainer: UserSessionContainer,
    private readonly requestHandler: RequestHandler,
  ) {
    this.log = loggerFactory.createForClass(PersistentLocalClientHandler)
    this.logPayload = config.getBoolean("logRecvPayload")
  }

  async onPersistentLocalClientReceived(localClient: PersistentLocalClient, payload: string) {
    const ip = localClient.getIp()
    if (ip && this.ddosManager.checkAndHandleDDOS(ip)) {
      sendGenericResponse(localClient, null, "invalidRequest", "")
      return
    }

    if (this.logPayload && this.log.isLevel(LogLevel.DEBUG)) {
      this.log.log(LogLevel.DEBUG, `RECV-WS: ${payload}`)
    }

    const request = parseRequestFromPayload(payload)
    if (request) {
      let theUserId: string | null = null

      const localClientInfo = localClient.info
      if (localClientInfo) {
        request.requestHeader.appId = localClientInfo.appId
        const { userId } = localClientInfo
        theUserId = userId
      }
      else {
        if (request.requestHeader.sessionId) {
          theUserId = await this.userSessionContainer.getUserIdBySessionId(request.requestHeader.sessionId)
        }
      }

      handlePromiseCatch(
        this.log,
        localClient,
        request.requestHeader.requestId || null,
        this.requestHandler.handleRequest(
          localClient,
          localClient.id,
          theUserId,
          request.requestHeader.requestId,
          request.requestHeader.func,
          request.requestHeader.appId,
          request.requestHeader.entityType,
          request.requestHeader.entityId,
          request.body ? JSON.parse(request.body) : null))
    }
  }

  onPersistentLocalClientConnected(): void {
  }

  async onPersistentLocalClientDisconnected(localClient: PersistentLocalClient): Promise<void> {
    const { info } = localClient
    if (info) {
      this.userSender.logout(info.userId, info.appId)
    }
  }
}
