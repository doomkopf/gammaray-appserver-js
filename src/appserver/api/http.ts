import { FuncContext, JsonObject, StatelessFunc } from "./core"

export type HttpMethod =
  "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"

export enum HttpStatus {
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,
  CHECKPOINT = 103,

  // 2xx Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  MULTI_STATUS = 207,
  ALREADY_REPORTED = 208,
  IM_USED = 226,

  // 3xx Redirection
  MULTIPLE_CHOICES = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,

  // --- 4xx Client Error ---
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  REQUESTED_RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  UPGRADE_REQUIRED = 426,
  PRECONDITION_REQUIRED = 428,
  TOO_MANY_REQUESTS = 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,

  // --- 5xx Server Error ---
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
  VARIANT_ALSO_NEGOTIATES = 506,
  INSUFFICIENT_STORAGE = 507,
  LOOP_DETECTED = 508,
  BANDWIDTH_LIMIT_EXCEEDED = 509,
  NOT_EXTENDED = 510,
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}

/**
 * Additional http related response data - see {@link ResponseSender.send}.
 */
export interface HttpResponseData {
  status: HttpStatus
  headers?: Record<string, number | string | ReadonlyArray<string>>
}

/**
 * Use this as the type for the params when it is called from a REST API.
 */
export interface HttpParams<P> {
  body: P

  getPathParam(name: string): string | undefined

  getHeader(name: string): string | undefined

  getQueryParam(name: string): string | undefined
}

/**
 * A helper definition for a http function.
 */
export type HttpFunc<P> = StatelessFunc<HttpParams<P>>

export interface HttpHeader {
  key: string
  value: string
}

export interface HttpHeaders {
  headers: HttpHeader[]
}

export interface HttpClientResponse {
  requestCtx: JsonObject | null
  httpResponse: {
    code?: number
    body: string
  }
}

/**
 * A http client.
 */
export interface HttpClient {
  /**
   * Starts the call to any http endpoint.
   * @param url the URL
   * @param method the http method
   * @param body the body or null in case there is none e.g. for GET or DELETE methods
   * @param headers the http headers
   * @param resultFunc the id of the function to handle the http response - the params of that function are of type {@link HttpClientResponse}
   * @param requestCtx any custom json object to keep a context for the resultFunc
   * @param ctx the usual function context
   */
  request(
    url: string,
    method: HttpMethod,
    body: string | null,
    headers: HttpHeaders,
    resultFunc: string,
    requestCtx: JsonObject | null,
    ctx: FuncContext,
  ): void
}
