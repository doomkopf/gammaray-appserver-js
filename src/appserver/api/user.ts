import { EntityId, FuncContext, JsonObject, StatelessFunc } from "./core"

/**
 * A collection of user related functions.
 */
export interface UserFunctions {
  /**
   * Sends/pushes data to a connected user.
   * In case of a persistent client e.g. a websocket connection, this doesn't require a previous request.
   * For non-persistent clients it only works once per request as an alternative to {@link ResponseSender.send}.
   */
  send(userId: EntityId, obj: JsonObject): void

  /**
   * Logs a user in. After that the user can be identified by {@link FuncContext.requestingUserId}.
   * Persistent clients e.g. websockets are logged in statefully meaning that the client doesn't need to include the sessionId in the request.
   * Non-persistent clients need to include the sessionId in each request that requires a logged-in user.
   * @param userId the userId to log in
   * @param loginFinishedFunctionId the function to be called after the login was finished. This function can be declared using the {@link LoginFinishedFunc} interface.
   * @param ctx the usual function context
   * @param customCtx an optional custom object to keep a context through the process - see {@link LoginResult.ctx}
   */
  login(userId: EntityId, loginFinishedFunctionId: string, ctx: FuncContext, customCtx?: JsonObject): void

  logout(userId: EntityId): void
}

/**
 * The params that are passed to the function that is called after a user was logged in.
 */
export interface LoginResult<P> {
  /**
   * The sessionId id for the logged-in user. The client needs to include it in the request in order to get identified.
   */
  sessionId: string
  /**
   * The customCtx param you passed into {@link UserFunctions.login}.
   */
  ctx?: P
}

/**
 * A helper definition for the function to implement when the login was finished.
 */
export type LoginFinishedFunc<P> = StatelessFunc<LoginResult<P>>
