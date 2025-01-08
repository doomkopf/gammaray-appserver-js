import { Logger } from "../lib/logging/Logger"
import { LogLevel } from "../lib/logging/LogLevel"
import { RequestContext } from "./webserver/http"
import { sendGenericResponse } from "./webserver/message"

export function handlePromiseCatch(log: Logger, requestContext: RequestContext, requestId: string | null, promise: Promise<unknown>): void {
  promise.catch(reason => {
    log.log(LogLevel.ERROR, "", reason)
    sendGenericResponse(requestContext, requestId, "internalError", "")
  })
}
