import { singleton } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Config } from "../Config"
import { handlePromiseCatch } from "../gammaray-tools"
import { RequestHandler } from "../RequestHandler"
import { UserSessionContainer } from "../UserSessionContainer"
import { DDOSManager } from "./DDOSManager"
import { BulkRequestListener, RequestContext } from "./http"
import { parseRequestFromPayload, sendGenericResponse } from "./message"

@singleton()
export class BulkRequestHandler implements BulkRequestListener {
  private readonly log: Logger
  private readonly logPayload: boolean

  constructor(
    loggerFactory: LoggerFactory,
    config: Config,
    private readonly userSessionContainer: UserSessionContainer,
    private readonly ddosManager: DDOSManager,
    private readonly requestHandler: RequestHandler,
  ) {
    this.log = loggerFactory.createForClass(BulkRequestHandler)
    this.logPayload = config.getBoolean("logRecvPayload")
  }

  async onBulkRequest(requestContext: RequestContext, ip: string | null, payload: string) {
    if (ip && this.ddosManager.checkAndHandleDDOS(ip)) {
      sendGenericResponse(requestContext, null, "invalidRequest", "")
      return
    }

    if (this.logPayload && this.log.isLevel(LogLevel.DEBUG)) {
      this.log.log(LogLevel.DEBUG, `RECV-HTTP: ${payload}`)
    }

    const request = parseRequestFromPayload(payload)
    if (request) {
      let userId: string | null = null
      if (request.requestHeader.sessionId) {
        userId = await this.userSessionContainer.getUserIdBySessionId(request.requestHeader.sessionId)
      }
      handlePromiseCatch(
        this.log,
        requestContext,
        request.requestHeader.requestId || null,
        this.requestHandler.handleRequest(
          requestContext,
          null,
          userId,
          request.requestHeader.requestId,
          request.requestHeader.func,
          request.requestHeader.appId,
          request.requestHeader.entityType,
          request.requestHeader.entityId,
          request.body ? JSON.parse(request.body) : null))
    }
  }
}
