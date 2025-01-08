import { singleton } from "tsyringe"
import { ClusterMapFactory } from "../cluster/map/ClusterMapFactory"
import { ClusterLocalCache } from "./ClusterLocalCache"

@singleton()
export class ClusterLocalCacheFactory {
  constructor(
    private readonly mapFactory: ClusterMapFactory,
  ) {
  }

  create(name: string): ClusterLocalCache {
    return new ClusterLocalCache(this.mapFactory.create(name))
  }
}
