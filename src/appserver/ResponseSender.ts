import { singleton } from "tsyringe"
import { Cache } from "../lib/cache/Cache"
import { CacheCleaner } from "../lib/cache/CacheCleaner"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { Scheduler } from "../lib/schedule/Scheduler"
import { JsonObject } from "./api/core"
import { HttpResponseData } from "./api/http"
import { AppserverCluster } from "./AppserverCluster"
import { CCMD_SEND_RESPONSE, SendResponse } from "./ClusterHandler"
import { RESPONSE_KEY_REQUEST_ID, RESPONSE_KEY_REQUEST_ID_HTTP } from "./constants"
import { RequestContext } from "./webserver/http"

export interface RequestSourceWorker {
  nId: string
  wId: string
}

@singleton()
export class ResponseSender implements ResponseSender {
  private readonly log: Logger

  private readonly requestIdToRequestContext: Cache<RequestContext>
  private readonly requestIdToRequestContextCleaner: CacheCleaner
  private readonly requestIdToSourceWorker: Cache<RequestSourceWorker>
  private readonly requestIdToSourceWorkerCleaner: CacheCleaner

  constructor(
    loggerFactory: LoggerFactory,
    private readonly cluster: AppserverCluster,
    scheduler: Scheduler,
  ) {
    this.log = loggerFactory.createForClass(ResponseSender)
    this.requestIdToRequestContext = new Cache(60000, 100000)
    this.requestIdToRequestContextCleaner = new CacheCleaner(this.requestIdToRequestContext, scheduler, 10000)
    this.requestIdToSourceWorker = new Cache(60000, 100000)
    this.requestIdToSourceWorkerCleaner = new CacheCleaner(this.requestIdToSourceWorker, scheduler, 10000)
  }

  registerLocalRequest(requestId: string, requestContext: RequestContext): void {
    this.requestIdToRequestContext.put(requestId, requestContext)
  }

  registerRemoteRequest(requestId: string, source: RequestSourceWorker): void {
    this.requestIdToSourceWorker.put(requestId, source)
  }

  getSourceWorker(requestId: string): RequestSourceWorker | null {
    return this.requestIdToSourceWorker.get(requestId)
  }

  send(requestId: string, payload: JsonObject, httpData?: HttpResponseData): void {
    const rc = this.requestIdToRequestContext.remove(requestId)
    if (!rc) {
      const source = this.requestIdToSourceWorker.remove(requestId)
      if (!source) {
        this.log.log(LogLevel.WARN, `No source found for requestId ${requestId}`)
        return
      }

      const sendResponse: SendResponse = {
        rId: requestId,
        data: payload,
        httpData,
      }
      this.cluster.sendToNode(source.nId, source.wId, CCMD_SEND_RESPONSE, sendResponse)

      return
    }

    if (httpData) {
      rc.status(httpData.status)
      rc.setHeader(RESPONSE_KEY_REQUEST_ID_HTTP, requestId)

      if (httpData.headers) {
        for (const name in httpData.headers) {
          rc.setHeader(name, httpData.headers[name])
        }
      }
    }
    else {
      if (payload) {
        payload[RESPONSE_KEY_REQUEST_ID] = requestId
      }
    }

    if (payload) {
      rc.send(JSON.stringify(payload))
    }
    else {
      rc.send("{}")
    }
  }

  shutdown(): void {
    this.requestIdToRequestContextCleaner.shutdown()
    this.requestIdToSourceWorkerCleaner.shutdown()
  }
}
