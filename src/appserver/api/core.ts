import { HttpResponseData } from "./http"
import { Lib } from "./lib"
import { EntityIndexing } from "./query"
import { RestApi } from "./rest"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonObject = Record<string, any>

/**
 * The root definition for a Gammaray application.
 */
export interface GammarayApp {
  /**
   * An object with string keys to {@link StatelessFunc}. All stateless functions need to be added here with a specific name.
   */
  readonly func: { [func: string]: StatelessFunc<never> }
  /**
   * An object with string keys to {@link EntityType}.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly entity: { [type: string]: EntityType<any> }
}

/**
 * The visibility that the function is supposed to have.
 */
export enum FuncVisibility {
  /**
   * The function is accessible publicly by clients.
   */
  pub,
  /**
   * The function is only accessible internally through the app itelf.
   */
  pri,
}

/**
 * Contains context about the current function call.
 */
export interface FuncContext {
  /**
   * A unique id for the current client request or null when the current call wasn't triggered through a client.
   */
  readonly requestId: string | null
  /**
   * Used only for internal purposes.
   */
  readonly persistentLocalClientId: string | null
  /**
   * The logged-in user that triggered the request or null in case the request was done anonymously or when the current call wasn't triggered through a client.
   */
  readonly requestingUserId: EntityId | null

  /**
   * A helper method to send the response back to the client. Only works when the requestId is available in the context. Uses the {@link ResponseSender} internally.
   * @param body the response body as JSON
   * @param httpData optional http response data in case you need to set the status or headers
   */
  sendResponse(body: JsonObject, httpData?: HttpResponseData): void
}

/**
 * A function that doesn't cover any state or entity.
 * Usually used as an entry point for querying or to do more complex use cases covering multiple entities.
 */
export interface StatelessFunc<P> {
  /**
   * The actual function implementation.
   */
  func: (lib: Lib, params: P, ctx: FuncContext) => void
  vis: FuncVisibility
  /**
   * An optional REST API definition.
   * No matter if set or not: A function may always be called through the internal protocol as well.
   */
  rest?: RestApi
}

export type EntityId = string

/**
 * A function covering one entity.
 */
export interface EntityFunc<E, P> {
  /**
   * The actual function implementation.
   * @param entity the entity that can be read and changed during the scope of the function. It might be null or undefined and the reason for not declaring it like that is that you always had to check for its presence which blows up the code. In most cases you know by the context, that it has to exist or not.
   * Returning the entity indicates that it has been changed and should be persisted.
   * Returning "delete" indicates to delete this entity. The next time the entity is addressed, the parameter will be null.
   * Returning nothing indicates to do nothing thus potential changes to the entity might get lost.
   * @param id the id of the entity
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  func: (entity: E, id: EntityId, lib: Lib, params: P, ctx: FuncContext) => E | void | "delete"
  vis: FuncVisibility
}

/**
 * Function to implement a specialized way of serializing an entity to persistency.
 */
export type SerializeEntity<E> = (id: EntityId, entity: E) => JsonObject
/**
 * Function to implement a specialized way of deserializing an entity from persistency.
 */
export type DeserializeEntity<E> = (id: EntityId, entity: JsonObject) => E
/**
 * Function to implement a migration from one version of an entity to the next.
 */
export type MigrateEntity<E> = (entity: JsonObject) => E

/**
 * Declares one type of entity for an application.
 */
export interface EntityType<E extends JsonObject> {
  /**
   * Optional serialization. If not specified, the entity will be serialized as it is.
   */
  serializeEntity?: SerializeEntity<E>
  /**
   * Optional deserialization. If not specified, the entity will be deserialized from a JSON string.
   * Keep in mind: When using classes for entities, and you don't specify an explicit deserialization, only the JSON attributes will be set and no methods.
   * So a proper implementation of this function might be needed in that case.
   */
  deserializeEntity?: DeserializeEntity<E>
  /**
   * A mapping from a version to migrate to, to the actual migration function.
   */
  migrate?: { [version: number]: MigrateEntity<E> }
  /**
   * Optional indexation configuration for this entity type.
   */
  index?: EntityIndexing
  /**
   * The current version this entity type.
   * Just for the migration system to know where to stop migrating.
   */
  currentVersion: number
  /**
   * An object with string keys to {@link EntityFunc}. All entity functions for this entity type need to be added here with a specific name.
   */
  func: { [func: string]: EntityFunc<E, never> }
}

export interface ResponseSender {
  /**
   * Sends a resulting response to a clients request.
   * @param requestId the id of the request. It should always be available as {@link FuncContext.requestId} as long as the request has been made by a client
   * @param obj the actual json body to send
   * @param httpData optional http response data in case you need to set the status or headers
   */
  send(requestId: string, obj: JsonObject, httpData?: HttpResponseData): void
}

export interface EntityFunctions {
  /**
   * Invokes a function asynchronously addressing one entity.
   */
  invoke(entityType: string, func: string, entityId: EntityId, params: JsonObject | null, ctx?: FuncContext): void
}
