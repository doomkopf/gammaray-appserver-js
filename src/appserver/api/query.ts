import { EntityId, FuncContext, JsonObject, StatelessFunc } from "./core"

export interface EntityIndexing {
  /**
   * The indexing mode about how an entity should be indexed for querying.
   * SIMPLE: All top level primitive attributes will be indexed.
   * Further options will be available soon.
   */
  mode: "SIMPLE"
}

/**
 * A range query for a number attribute of an entity with optional min and max value.
 */
export interface EntityQueryAttributeNumberRange {
  min?: number
  max?: number
}

/**
 * The part of a query were you specify how to match for a value of an entity.
 */
export interface EntityQueryAttributeValue {
  /**
   * Exact match of the given value.
   */
  match?: string | number | boolean
  /**
   * Number range match of the given range values.
   */
  range?: EntityQueryAttributeNumberRange
}

/**
 * Declares how to query for an attribute of an entity.
 */
export interface EntityQueryAttribute {
  /**
   * The name of the entities attribute.
   */
  name: string
  value: EntityQueryAttributeValue
}

/**
 * The root of a query for entity ids.
 */
export interface EntityQuery {
  /**
   * A list of declarations for all the attributes of the entity type by which you want to match on.
   */
  attributes: EntityQueryAttribute[]
}

/**
 * Use this as the type for the params for the result of a query ({@link EntityQueries.query}).
 */
export interface EntityQueryFinishedFunctionParams<P> {
  /**
   * The ids of all entities matching your query.
   */
  ids: EntityId[]
  /**
   * The customCtx param you passed into {@link EntityQueries.query}.
   */
  ctx?: P
}

/**
 * A helper definition for the function to implement when the query has finished.
 */
export type EntityQueryFinishedFunc<P> = StatelessFunc<EntityQueryFinishedFunctionParams<P>>

export interface EntityQueries {
  /**
   * Starts the query for entity ids.
   * @param entityType the type of the entity
   * @param queryFinishedFunctionId the id of the function to handle the result of the query. This function can be declared using the {@link EntityQueryFinishedFunc} interface.
   * @param query the actual query definition
   * @param ctx the usual function context
   * @param customCtx an optional custom object to keep a context through the process - see {@link EntityQueryFinishedFunctionParams.ctx}
   */
  query(entityType: string, queryFinishedFunctionId: string, query: EntityQuery, ctx: FuncContext, customCtx?: JsonObject): void
}
