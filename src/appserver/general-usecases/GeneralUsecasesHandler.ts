import { singleton } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { JsonObject } from "../api/core"
import { AppManager } from "../AppManager"
import { Config } from "../Config"
import { UC_DEPLOY_APPSCRIPT, UC_DEPLOY_BIGOBJECT } from "../constants"
import { RequestContext } from "../webserver/http"
import { sendGenericResponse } from "../webserver/message"
import { deployAppScript, DeployAppScriptRequest } from "./deploy-app-script"
import { deployBigObject, DeployBigObjectRequest } from "./deploy-big-object"

@singleton()
export class GeneralUsecasesHandler {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    private readonly config: Config,
    private readonly appManager: AppManager,
  ) {
    this.log = loggerFactory.createForClass(GeneralUsecasesHandler)
  }

  async handleGeneralUsecases(
    requestContext: RequestContext,
    funcId: string,
    params: JsonObject,
  ): Promise<boolean> {
    try {
      if (params && funcId === UC_DEPLOY_APPSCRIPT) {
        const result = await deployAppScript(this.log, this.appManager, this.config, params as DeployAppScriptRequest)
        sendGenericResponse(requestContext, null, result.status, UC_DEPLOY_APPSCRIPT, result.msg)
        return true
      }

      if (params && funcId === UC_DEPLOY_BIGOBJECT) {
        await deployBigObject(this.log, this.appManager, requestContext, this.config, params as DeployBigObjectRequest)
        return true
      }
    }
    catch (err) {
      this.log.log(LogLevel.ERROR, "", err)

      requestContext.send(JSON.stringify({
        status: "internalError",
        uc: funcId,
        msg: err.message,
      }))
    }

    return false
  }
}
