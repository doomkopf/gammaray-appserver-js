import { singleton } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { HttpParams, HttpStatus } from "../api/http"
import { GAMMARAY_HEADER_SESSION_ID } from "../api/rest"
import { AppManager, AppStatus } from "../AppManager"
import { RequestHandler } from "../RequestHandler"
import { UserSessionContainer } from "../UserSessionContainer"
import { DDOSManager } from "./DDOSManager"
import { HttpRequest, HttpRequestListener, RequestContext } from "./http"
import { sendGenericResponse } from "./message"

@singleton()
export class HttpRequestHandler implements HttpRequestListener {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    private readonly ddosManager: DDOSManager,
    private readonly appManager: AppManager,
    private readonly requestHandler: RequestHandler,
    private readonly userSessionContainer: UserSessionContainer,
  ) {
    this.log = loggerFactory.createForClass(HttpRequestHandler)
  }

  async onHttpRequest(requestContext: RequestContext, ip: string | null, request: HttpRequest) {
    if (ip && this.ddosManager.checkAndHandleDDOS(ip)) {
      requestContext.status(HttpStatus.BAD_REQUEST)
      sendGenericResponse(requestContext, null, "invalidRequest", "")
      return
    }

    const path = request.path.split("/")

    const [appId] = path

    const appResult = await this.appManager.getApp(appId)
    if (appResult.status === AppStatus.NOT_FOUND || !appResult.app) {
      requestContext.status(HttpStatus.NOT_FOUND)
      sendGenericResponse(requestContext, null, "invalidAppId", "")
      return
    }

    if (appResult.status === AppStatus.UNDER_MAINTENANCE) {
      requestContext.status(HttpStatus.NOT_FOUND)
      sendGenericResponse(requestContext, null, "appUnderMaintenance", "")
      return
    }

    const { app } = appResult

    if (request.method === "GET" && path[1] === "openapi") {
      requestContext.status(HttpStatus.OK)
      requestContext.send(JSON.stringify(app.openapi.json))
      return
    }

    const funcAndPathParams = app.restMapping.determineFuncAndPathParams(request.method, request.path)
    if (!funcAndPathParams) {
      this.log.log(LogLevel.WARN, `Received unmapped http request - method=${request.method} path=${request.path}`)
      return
    }

    const httpParams: HttpParams<unknown> = {
      body: request.body ? JSON.parse(request.body) : null,

      getPathParam(name: string): string | undefined {
        return funcAndPathParams.params.get(name)
      },

      getHeader(name: string): string | undefined {
        return request.getHeader(name)
      },

      getQueryParam(name: string): string | undefined {
        return request.getParam(name)
      },
    }

    const sessionId = request.getHeader(GAMMARAY_HEADER_SESSION_ID)
    let userId: string | null = null
    if (sessionId) {
      userId = await this.userSessionContainer.getUserIdBySessionId(sessionId)
    }

    this.requestHandler.handleRequest(
      requestContext,
      null,
      userId,
      undefined,
      funcAndPathParams.func,
      appId,
      undefined,
      undefined,
      httpParams,
    )
  }
}
