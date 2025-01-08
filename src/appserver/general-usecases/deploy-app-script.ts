import { Logger } from "../../lib/logging/Logger"
import { LogLevel } from "../../lib/logging/LogLevel"
import { base64unzip } from "../../lib/tools/zip"
import { AppManager } from "../AppManager"
import { Config } from "../Config"
import { NetStatusCode } from "../webserver/message"

export interface DeployAppScriptRequest {
  appId: string
  pw: string
  script: string
}

export async function deployAppScript(
  logger: Logger,
  appManager: AppManager,
  config: Config,
  request: DeployAppScriptRequest,
): Promise<{ status: NetStatusCode, msg?: string }> {
  if (request.pw !== config.getString("appDeploymentPassword")) {
    return { status: "invalidPassword" }
  }

  let script: string
  try {
    script = await base64unzip(request.script)
  }
  catch (err) {
    logger.log(LogLevel.ERROR, "", err)
    return { status: "invalidRequest", msg: "Error unzipping script" }
  }

  if (!script || !script.trim().length) {
    return { status: "invalidRequest", msg: "Script is empty" }
  }

  try {
    eval(script)
  }
  catch (err) {
    logger.log(LogLevel.ERROR, "Error evaluating app script on deployment", err)
    return { status: "invalidRequest", msg: err.message }
  }

  await appManager.enableMaintenance(request.appId)

  await appManager.shutdownApp(request.appId, true)

  await appManager.storeAppScript(request.appId, script)

  await appManager.disableMaintenance(request.appId)

  return { status: "ok" }
}
