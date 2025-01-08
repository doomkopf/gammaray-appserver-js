import { JsonObject } from "./core"

/**
 * For big static custom objects e.g. a huge map/dictionary of ip addresses to geo coordinates.
 * It will be kept in memory, thus it should not exceed the memory of any machine in the cluster.
 * Such objects can be deployed through the CLI.
 */
export interface BigObjects {
  getObject(id: string): JsonObject | undefined
}
