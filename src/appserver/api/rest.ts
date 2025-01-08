import { HttpMethod } from "./http"

export const GAMMARAY_HEADER_SESSION_ID = "x-sessionid"

export interface RestApi {
  method: HttpMethod
  /**
   * The actual path of the endpoint while some can be extracted as a variable.
   */
  path: HttpPathElement[]
  /**
   * Optional parameter documentation.
   */
  params?: RestApiParam[]
  /**
   * Optional description.
   */
  description?: string
}

/**
 * A path element for a REST API.
 * Can be a fixed name or a variable e.g. GET /person/123
 * while person would be { name: "person" } and 123 would be {name: "id", isVar: true}
 */
export interface HttpPathElement {
  name: string
  isVar?: boolean
}

/**
 * REST API parameter documentation.
 */
export interface RestApiParam {
  name: string
  in: "body" | "path" | "query" | "header"
  description?: string
  required?: boolean
  schema?: RestApiParamSchema
}

/**
 * REST API parameter type.
 */
type RestApiParamSchemaPropertyType = "string" | "integer" | "object" | "array"

/**
 * REST API parameter schema.
 */
type RestApiParamSchema = Record<string, {
  type: RestApiParamSchemaPropertyType,
  properties?: Record<string, RestApiParamSchema>,
}>
