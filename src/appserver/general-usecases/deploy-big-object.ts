import { Logger } from "../../lib/logging/Logger"
import { LogLevel } from "../../lib/logging/LogLevel"
import { base64unzip } from "../../lib/tools/zip"
import { JsonObject } from "../api/core"
import { AppManager } from "../AppManager"
import { Config } from "../Config"
import { UC_DEPLOY_BIGOBJECT } from "../constants"
import { RequestContext } from "../webserver/http"
import { NetStatusCode, sendGenericResponse } from "../webserver/message"

export interface DeployBigObjectRequest {
  appId: string
  pw: string
  id: string
  obj: string
}

function sendResponse(requestContext: RequestContext, status: NetStatusCode, msg?: string) {
  sendGenericResponse(requestContext, null, status, UC_DEPLOY_BIGOBJECT, msg)
}

export async function deployBigObject(
  logger: Logger,
  appManager: AppManager,
  requestContext: RequestContext,
  config: Config,
  request: DeployBigObjectRequest,
): Promise<void> {
  if (request.pw !== config.getString("appDeploymentPassword")) {
    sendResponse(requestContext, "invalidPassword")
    return
  }

  let objString: string
  try {
    objString = await base64unzip(request.obj)
  }
  catch (err) {
    logger.log(LogLevel.ERROR, "", err)
    sendResponse(requestContext, "invalidRequest", "Error unzipping big object")
    return
  }

  if (!request.id) {
    sendResponse(requestContext, "invalidRequest", "Id is empty")
    return
  }

  if (!objString || !objString.trim().length) {
    sendResponse(requestContext, "invalidRequest", "Big object is empty")
    return
  }

  let bigObject: JsonObject
  try {
    bigObject = JSON.parse(objString)
  }
  catch (err) {
    logger.log(LogLevel.ERROR, "Error parsing big object on deployment", err)
    sendResponse(requestContext, "invalidRequest", err.message)
    return
  }

  await appManager.enableMaintenance(request.appId)

  await appManager.shutdownApp(request.appId, true)

  await appManager.storeBigObject(request.appId, request.id, bigObject)

  await appManager.disableMaintenance(request.appId)

  sendResponse(requestContext, "ok")
}
