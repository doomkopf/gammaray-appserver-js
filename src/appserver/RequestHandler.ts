import { singleton } from "tsyringe"
import { isEntityIdValid } from "../lib/tools/tools"
import { generateUuid } from "../lib/tools/uuid"
import { JsonObject } from "./api/core"
import { AppManager, AppStatus } from "./AppManager"
import { GeneralUsecasesHandler } from "./general-usecases/GeneralUsecasesHandler"
import { ResponseSender } from "./ResponseSender"
import { RequestContext } from "./webserver/http"
import { sendGenericResponse } from "./webserver/message"

@singleton()
export class RequestHandler {
  constructor(
    private readonly generalUsecasesHandler: GeneralUsecasesHandler,
    private readonly appManager: AppManager,
    private readonly responseSender: ResponseSender,
  ) {
  }

  async handleRequest(
    requestContext: RequestContext,
    localClientId: string | null,
    userId: string | null,
    headerRequestId: string | undefined,
    func: string,
    appId: string | undefined,
    entityType: string | undefined,
    entityId: string | undefined,
    params: JsonObject,
  ) {
    if (await this.generalUsecasesHandler.handleGeneralUsecases(requestContext, func, params)) {
      return
    }

    if (!appId) {
      sendGenericResponse(requestContext, headerRequestId || null, "invalidAppId", "")
      return
    }

    const appResult = await this.appManager.getApp(appId)
    if (appResult.status === AppStatus.NOT_FOUND || !appResult.app) {
      sendGenericResponse(requestContext, headerRequestId || null, "invalidAppId", "")
      return
    }

    if (appResult.status === AppStatus.UNDER_MAINTENANCE) {
      sendGenericResponse(requestContext, headerRequestId || null, "appUnderMaintenance", "")
      return
    }

    const { app } = appResult

    if (!app.isPublicFunc(func, entityType)) {
      sendGenericResponse(requestContext, headerRequestId || null, "invalidFunc", "")
      return
    }

    const requestId = headerRequestId || generateUuid()

    this.responseSender.registerLocalRequest(requestId, requestContext)

    if (entityId) {
      if (!isEntityIdValid(entityId)) {
        sendGenericResponse(requestContext, requestId, "invalidRequest", func, "Invalid entityId")
        return
      }
    }

    app.handleFunc(
      requestId,
      localClientId,
      userId,
      func,
      entityType || null,
      entityId || null,
      params,
    )
  }
}
