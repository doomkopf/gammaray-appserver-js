import { ClusterMap } from "../../cluster/map/ClusterMap"
import { ClusterMapFactory } from "../../cluster/map/ClusterMapFactory"
import { Database } from "../Database"

export class DistributedInMemoryDatabase implements Database {
  private readonly map: ClusterMap

  constructor(
    factory: ClusterMapFactory,
  ) {
    this.map = factory.create("im-db")
  }

  get(key: string): Promise<string | null> {
    return this.map.get(key)
  }

  put(key: string, value: string): Promise<void> {
    return this.map.put(key, value)
  }

  remove(key: string): Promise<void> {
    return this.map.remove(key)
  }

  async shutdown(): Promise<void> {
  }
}
