import { EntityId, FuncContext, JsonObject, StatelessFunc } from "./core"

/**
 * A collection of functions dealing with lists of strings.
 */
export interface ListFunctions {
  add(listId: EntityId, elemToAdd: string): void

  remove(listId: EntityId, elemToRemove: string): void

  clear(listId: EntityId): void

  /**
   * Starts the iteration through a list asynchronously.
   * @param listId the id of the list to iterate through
   * @param iterationFunctionId the function that contains the iteration logic. This function can be declared using the {@link ListIteractionFunc} interface.
   * @param iterationFinishedFunctionId the function that is called when the iteration has finished. This function can be declared using the {@link ListIteractionFinishedFunc} interface.
   * @param ctx the usual function context
   * @param customCtx an optional custom object to keep a context through the process - see {@link ListIterationFunctionParams.ctx} and {@link ListIterationFinishedFunctionParams.ctx}
   */
  iterate(listId: EntityId, iterationFunctionId: string, iterationFinishedFunctionId: string, ctx: FuncContext, customCtx?: JsonObject): void
}

/**
 * Use this as the type for the params for iterating through a list ({@link ListFunctions.iterate}).
 */
export interface ListIterationFunctionParams<P> {
  /**
   * Since you cannot have one big lists of potentially millions of entries, this is just a chunk of it.
   * Of course, you could just store it in one in big list in the context, but keep in mind that you might run out of memory when you do that.
   */
  listChunk: string[]
  /**
   * The customCtx param you passed into {@link ListFunctions.iterate}.
   */
  ctx?: P
}

/**
 * Use this as the type for the params after iterating through a list ({@link ListFunctions.iterate}).
 */
export interface ListIterationFinishedFunctionParams<P> {
  /**
   * The customCtx param you passed into {@link ListFunctions.iterate}.
   */
  ctx?: P
}

/**
 * A helper definition for the function to implement for iterating through a list.
 */
export type ListIteractionFunc<P> = StatelessFunc<ListIterationFunctionParams<P>>

/**
 * A helper definition for the function to implement when the iteration through a list has finished.
 */
export type ListIteractionFinishedFunc<P> = StatelessFunc<ListIterationFinishedFunctionParams<P>>
