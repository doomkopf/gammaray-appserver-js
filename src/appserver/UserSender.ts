import { delay, inject, singleton } from "tsyringe"
import { Cache } from "../lib/cache/Cache"
import { CacheCleaner } from "../lib/cache/CacheCleaner"
import { ClusterLocalCache } from "../lib/cache/ClusterLocalCache"
import { ClusterLocalCacheFactory } from "../lib/cache/ClusterLocalCacheFactory"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { Scheduler } from "../lib/schedule/Scheduler"
import { JsonObject } from "./api/core"
import { AppManager } from "./AppManager"
import { AppserverCluster } from "./AppserverCluster"
import {
  CCMD_REMOVE_PERSISTENT_LOCAL_CLIENT,
  CCMD_SEND_TO_USER,
  RemovePersistentLocalClient,
  SendToUser,
} from "./ClusterHandler"
import { PersistentLocalClient } from "./webserver/PersistentLocalClient"

interface Worker {
  nId: string
  wId: string
}

@singleton()
export class UserSender {
  private readonly log: Logger

  private readonly userIdToLocalClient: Cache<PersistentLocalClient>
  private readonly userIdToLocalClientCleaner: CacheCleaner

  private readonly userIdToWorker: ClusterLocalCache
  private readonly localWorkerJson: string

  constructor(
    loggerFactory: LoggerFactory,
    @inject("nodeId") private readonly nodeId: string,
    @inject("workerId") private readonly workerId: string,
    private readonly cluster: AppserverCluster,
    @inject(delay(() => AppManager)) private readonly appManager: AppManager, // again: there's no circular dependency here
    clusterLocalCacheFactory: ClusterLocalCacheFactory,
    scheduler: Scheduler,
  ) {
    this.log = loggerFactory.createForClass(UserSender)

    this.userIdToLocalClient = new Cache(3600000, 10000)
    this.userIdToLocalClientCleaner = new CacheCleaner(this.userIdToLocalClient, scheduler, 300000)

    this.userIdToWorker = clusterLocalCacheFactory.create("userIdToWorker")
    const worker: Worker = { nId: nodeId, wId: workerId }
    this.localWorkerJson = JSON.stringify(worker)
  }

  async send(userId: string, payload: JsonObject) {
    const localClient = this.userIdToLocalClient.get(userId)
    if (localClient) {
      localClient.send(JSON.stringify(payload))
    }
    else {
      const workerStr = await this.userIdToWorker.get(userId)
      if (!workerStr) {
        this.log.log(LogLevel.WARN, `No worker found for user ${userId}`)
        return
      }

      const worker = JSON.parse(workerStr) as Worker

      const msg: SendToUser = {
        uId: userId,
        data: payload,
      }
      this.cluster.sendToNode(worker.nId, worker.wId, CCMD_SEND_TO_USER, msg)
    }
  }

  putLocalClient(userId: string, client: PersistentLocalClient): void {
    this.userIdToLocalClient.put(userId, client)
    this.userIdToWorker.put(userId, this.localWorkerJson)
  }

  async logoutLocal(userId: string, appId: string) {
    this.userIdToLocalClient.remove(userId)

    const appResult = await this.appManager.getApp(appId)
    if (appResult.app) {
      appResult.app.onUserLoggedOut(userId)
    }
  }

  async logout(userId: string, appId: string) {
    const workerStr = await this.userIdToWorker.get(userId)
    if (!workerStr) {
      return
    }

    const worker = JSON.parse(workerStr) as Worker

    await this.userIdToWorker.remove(userId, workerStr)

    // user was on another worker and needs to be removed there locally
    if (worker.nId !== this.nodeId || worker.wId !== this.workerId) {
      const msg: RemovePersistentLocalClient = {
        userId,
        appId,
      }
      this.cluster.sendToNode(worker.nId, worker.wId, CCMD_REMOVE_PERSISTENT_LOCAL_CLIENT, msg)
    }
    else {
      this.logoutLocal(userId, appId)
    }
  }

  shutdown(): void {
    this.userIdToLocalClientCleaner.shutdown()
  }
}
