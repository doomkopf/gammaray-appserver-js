import { BigObjects } from "./bigobjects"
import { EntityFunctions, ResponseSender } from "./core"
import { HttpClient } from "./http"
import { ListFunctions } from "./list"
import { Logger } from "./log"
import { EntityQueries } from "./query"
import { Tools } from "./tools"
import { UserFunctions } from "./user"

/**
 * A lib of all components that can be used in a function.
 */
export interface Lib {
  readonly responseSender: ResponseSender
  readonly user: UserFunctions
  readonly tools: Tools
  readonly entityFunc: EntityFunctions
  readonly listFunc: ListFunctions
  readonly entityQueries: EntityQueries
  readonly httpClient: HttpClient
  readonly log: Logger
  readonly bigObjects: BigObjects
}
