import { inject, singleton } from "tsyringe"
import { ClusterLocalCache } from "../lib/cache/ClusterLocalCache"
import { ClusterLocalCacheFactory } from "../lib/cache/ClusterLocalCacheFactory"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { calcWorkerId, entityFullKey } from "../lib/tools/tools"
import { JsonObject } from "./api/core"
import { AppserverCluster, RemoteNodeResult } from "./AppserverCluster"
import { CCMD_INVOKE_ENTITY_FUNC, InvokeEntityFunc } from "./ClusterHandler"
import { RequestSourceWorker, ResponseSender } from "./ResponseSender"

@singleton()
export class EntityRouter {
  private readonly log: Logger
  private readonly clusterCache: ClusterLocalCache

  constructor(
    loggerFactory: LoggerFactory,
    @inject("nodeId") private readonly localNodeId: string,
    @inject("nodeWorkerIds") private readonly nodeWorkerIds: string[],
    @inject("workerId") private readonly localWorkerId: string,
    clusterLocalCacheFactory: ClusterLocalCacheFactory,
    private readonly cluster: AppserverCluster,
    private readonly responseSender: ResponseSender,
  ) {
    this.log = loggerFactory.createForClass(EntityRouter)

    this.clusterCache = clusterLocalCacheFactory.create(EntityRouter.name)
  }

  /**
   * True if redirected - false if not.
   */
  async redirectOrLocal(
    appId: string,
    entityType: string,
    func: string,
    entityId: string,
    requestId: string | null,
    persistentLocalClientId: string | null,
    userId: string | null,
    payload: JsonObject | null,
  ): Promise<boolean> {
    const key = entityFullKey(appId, entityType, entityId)

    let nodeId = await this.clusterCache.get(key)
    if (!nodeId) {
      nodeId = await this.determineNodeId(key)
    }
    else {
      this.log.log(LogLevel.DEBUG, `Using existing mapping for node=${nodeId} - key=${key}`)
    }

    if (nodeId === this.localNodeId) {
      const workerId = calcWorkerId(key, this.nodeWorkerIds)
      if (workerId === this.localWorkerId) {
        return false
      }
    }

    let sourceWorker: RequestSourceWorker | null = null
    if (requestId) {
      sourceWorker = this.responseSender.getSourceWorker(requestId)
    }
    if (!sourceWorker) {
      sourceWorker = {
        nId: this.localNodeId,
        wId: this.localWorkerId,
      }
    }

    const invokeEntityFunc: InvokeEntityFunc = {
      appId,
      requestId,
      persistentLocalClientId,
      userId,
      func,
      entityType,
      entityId,
      payload,
      rs: sourceWorker,
    }
    const result = this.cluster.sendToNode(nodeId, null, CCMD_INVOKE_ENTITY_FUNC, invokeEntityFunc)
    if (result === RemoteNodeResult.NOT_FOUND) {
      this.log.log(LogLevel.WARN, `Remote node=${nodeId} not found - gonna determine new node for key=${key}`)

      await this.clusterCache.remove(key, nodeId)
      nodeId = await this.determineNodeId(key)
      this.cluster.sendToNode(nodeId, null, CCMD_INVOKE_ENTITY_FUNC, invokeEntityFunc)
    }

    return true
  }

  private async determineNodeId(key: string): Promise<string> {
    const nodeIds = this.cluster.getAllNodeIds()
    // Possibly implement it based on real load of a node some day
    let nodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)]

    const existingNodeId = await this.clusterCache.putIfAbsent(key, nodeId)
    if (existingNodeId) {
      nodeId = existingNodeId
      this.log.log(LogLevel.DEBUG, `Determined node=${nodeId} - key=${key} (atomic collision - using existing)`)
    }
    else {
      this.log.log(LogLevel.DEBUG, `Determined node=${nodeId} - key=${key}`)
    }

    return nodeId
  }

  async releaseEntityMapping(appId: string, entityType: string, entityId: string): Promise<void> {
    return this.clusterCache.remove(entityFullKey(appId, entityType, entityId))
  }
}
