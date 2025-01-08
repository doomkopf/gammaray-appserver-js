import { singleton } from "tsyringe"
import { ClusterLocalCache } from "../lib/cache/ClusterLocalCache"
import { ClusterLocalCacheFactory } from "../lib/cache/ClusterLocalCacheFactory"

@singleton()
export class UserSessionContainer {
  private readonly clusterSharedCache: ClusterLocalCache

  constructor(
    clusterLocalCacheFactory: ClusterLocalCacheFactory,
  ) {
    this.clusterSharedCache = clusterLocalCacheFactory.create(UserSessionContainer.name)
  }

  put(sessionId: string, userId: string) {
    return this.clusterSharedCache.put(sessionId, userId)
  }

  getUserIdBySessionId(sessionId: string): Promise<string | null> {
    return this.clusterSharedCache.get(sessionId)
  }

  getSessionCount(): Promise<number> {
    return this.clusterSharedCache.size()
  }
}
