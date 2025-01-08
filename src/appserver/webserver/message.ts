import { HttpStatus } from "../api/http"
import { RESPONSE_KEY_REQUEST_ID } from "../constants"
import { ResponseSender } from "../ResponseSender"
import { RequestContext } from "./http"

export interface RequestHeader {
  func: string
  appId?: string
  entityType?: string
  entityId?: string
  sessionId?: string
  requestId?: string
}

export interface Request {
  requestHeader: RequestHeader
  body: string | null
}

export type NetStatusCode =
  "ok"
  | "internalError"
  | "invalidRequest"
  | "invalidPassword"
  | "invalidAppId"
  | "appUnderMaintenance"
  | "invalidFunc"

const STATUS_INTERNAL_ERROR: NetStatusCode = "internalError"

const HEADER_SPLIT_DELIMITER = "&"
const HEADER_ELEMENTS = 6
const JSON_SPLIT_REGEX = /{(.+)/

function parseStringElement(headerElements: string[], index: number): string | undefined {
  let strId = undefined
  if (headerElements.length > index) {
    strId = headerElements[index]
  }

  return strId
}

export function parseRequestHeader(headerString: string): RequestHeader | null {
  if (!headerString) {
    return null
  }

  const headerElements = headerString.split(HEADER_SPLIT_DELIMITER)
  if (headerElements.length > HEADER_ELEMENTS) {
    return null
  }

  const func = parseStringElement(headerElements, 0)
  if (!func) {
    return null
  }

  const appId = parseStringElement(headerElements, 1)
  const entityType = parseStringElement(headerElements, 2)
  const entityId = parseStringElement(headerElements, 3)
  const sessionId = parseStringElement(headerElements, 4)
  const requestId = parseStringElement(headerElements, 5)

  return { func, appId, entityType, entityId, sessionId, requestId }
}

export function parseRequestFromPayload(payload: string): Request | null {
  payload = payload.trim()
  const headerJsonSplit = payload.split(JSON_SPLIT_REGEX)
  const requestHeader = parseRequestHeader(headerJsonSplit[0])
  if (!requestHeader) {
    return null
  }

  return { requestHeader, body: headerJsonSplit.length > 1 ? `{${headerJsonSplit[1]}` : null }
}

export function sendFuncErrorToPotentialClient(responseSender: ResponseSender, requestId: string, entityType: string, func: string, msg: string): void {
  responseSender.send(requestId, {
    status: STATUS_INTERNAL_ERROR,
    entityType,
    func,
    msg,
  }, {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  })
}

export function sendGenericResponse(requestContext: RequestContext, requestId: string | null, status: NetStatusCode, useCaseId: string, msg?: string): void {
  requestContext.send(JSON.stringify({
    [RESPONSE_KEY_REQUEST_ID]: requestId || undefined,
    status,
    uc: useCaseId,
    msg,
  }))
}
