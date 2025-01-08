import { FuncContext, JsonObject } from "./api/core"
import { HttpResponseData } from "./api/http"
import { ResponseSender } from "./ResponseSender"

export class FuncContextImpl implements FuncContext {
  constructor(
    readonly requestId: string | null,
    readonly persistentLocalClientId: string | null,
    readonly requestingUserId: string | null,
    private readonly responseSender: ResponseSender,
  ) {
  }

  sendResponse(payload: JsonObject, httpData?: HttpResponseData): void {
    if (this.requestId) {
      this.responseSender.send(this.requestId, payload, httpData)
    }
  }
}
