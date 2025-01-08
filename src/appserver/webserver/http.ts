import { HttpMethod } from "../api/http"
import { PersistentLocalClient } from "./PersistentLocalClient"

export const HTTP_BULK_API_PATH = "gamapi"
export const HTTP_REST_API_PATH = "api"

export interface HttpRequest {
  path: string
  method: HttpMethod
  body: string | undefined

  getHeader(name: string): string | undefined

  getParam(name: string): string | undefined
}

export interface HttpRequestListener {
  onHttpRequest(requestContext: RequestContext, ip: string | null, request: HttpRequest): void
}

export interface RequestContext {
  send(payload?: string): void

  status(code: number): void

  setHeader(name: string, value: number | string | ReadonlyArray<string>): void
}

export interface PersistentLocalClientInfo {
  userId: string
  appId: string
}

export interface BulkRequestListener {
  onBulkRequest(requestContext: RequestContext, ip: string | null, payload: string): void
}

export interface PersistentLocalClientListener {
  onPersistentLocalClientReceived(localClient: PersistentLocalClient, payload: string): void

  onPersistentLocalClientConnected(localClient: PersistentLocalClient): void

  onPersistentLocalClientDisconnected(localClient: PersistentLocalClient): void
}
