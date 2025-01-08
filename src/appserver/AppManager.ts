import { singleton } from "tsyringe"
import { ClusterLocalCache } from "../lib/cache/ClusterLocalCache"
import { ClusterLocalCacheFactory } from "../lib/cache/ClusterLocalCacheFactory"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { JsonObject } from "./api/core"
import { App } from "./app/App"
import { AppContainer } from "./AppContainer"
import { AppLoader } from "./AppLoader"
import { AppScriptRepository } from "./AppScriptRepository"
import { AppserverCluster } from "./AppserverCluster"
import { BigObjectRepository } from "./BigObjectRepository"
import { AppMaintenance, CCMD_SHUTDOWN_APP } from "./ClusterHandler"

export enum AppStatus {
  OK,
  UNDER_MAINTENANCE,
  NOT_FOUND,
}

@singleton()
export class AppManager {
  private readonly log: Logger
  private readonly apps = new Map<string, AppContainer>()
  private readonly appsInMaintenance: ClusterLocalCache

  constructor(
    loggerFactory: LoggerFactory,
    private readonly appLoader: AppLoader,
    private readonly appScriptRepository: AppScriptRepository,
    private readonly bigObjectRepository: BigObjectRepository,
    private readonly cluster: AppserverCluster,
    clusterLocalCacheFactory: ClusterLocalCacheFactory,
  ) {
    this.log = loggerFactory.createForClass(AppManager)

    this.appsInMaintenance = clusterLocalCacheFactory.create("appsInMaintenance")
  }

  async getApp(id: string): Promise<{ status: AppStatus, app?: App }> {
    if (await this.isInMaintenance(id)) {
      this.log.log(LogLevel.INFO, `App in maintenance: ${id}`)
      return { status: AppStatus.UNDER_MAINTENANCE }
    }

    const app = this.apps.get(id)
    if (!app) {
      const script = await this.appScriptRepository.getAppScript(id)
      if (!script) {
        return { status: AppStatus.NOT_FOUND }
      }
      const loadedApp = await this.appLoader.loadApp(id, script)
      if (loadedApp) {
        this.apps.set(id, loadedApp)
        return { status: AppStatus.OK, app: loadedApp.app }
      }

      return { status: AppStatus.NOT_FOUND }
    }

    return { status: AppStatus.OK, app: app.app }
  }

  getAppIfLoaded(id: string): App | null {
    const app = this.apps.get(id)
    if (!app) {
      return null
    }

    return app.app
  }

  getLoadedAppIds(): Iterable<string> {
    return this.apps.keys()
  }

  async shutdownApp(id: string, broadcast: boolean): Promise<void> {
    const app = this.apps.get(id)
    if (app) {
      this.apps.delete(id)
      await app.shutdown()
      this.log.log(LogLevel.INFO, `App <${id}> has been shut down`)
    }
    else {
      this.log.log(LogLevel.INFO, `App <${id}> not loaded - no need to shut down`)
    }

    if (broadcast) {
      const message: AppMaintenance = { id }
      this.cluster.broadcast(CCMD_SHUTDOWN_APP, message)
    }
  }

  enableMaintenance(id: string) {
    this.appsInMaintenance.put(id, "")
  }

  async isInMaintenance(id: string): Promise<boolean> {
    const val = await this.appsInMaintenance.get(id)
    return val === ""
  }

  disableMaintenance(id: string) {
    this.appsInMaintenance.remove(id)
  }

  async storeAppScript(id: string, script: string): Promise<void> {
    return this.appScriptRepository.storeAppScript(id, script)
  }

  async storeBigObject(appId: string, id: string, obj: JsonObject): Promise<void> {
    return this.bigObjectRepository.store(appId, id, obj)
  }

  async shutdown(): Promise<void> {
    for (const app of this.apps.values()) {
      await app.shutdown()
    }
  }
}
