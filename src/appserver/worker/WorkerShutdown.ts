import { inject, singleton } from "tsyringe"
import { HazelcastClientContainer } from "../../lib/cluster/hazelcast/HazelcastClientContainer"
import { Database } from "../../lib/db/Database"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { AppManager } from "../AppManager"
import { MetricsLogger } from "../MetricsLogger"
import { ResponseSender } from "../ResponseSender"
import { UserSender } from "../UserSender"
import { DDOSManager } from "../webserver/DDOSManager"
import { WebServer } from "../webserver/WebServer"

@singleton()
export class WorkerShutdown {
  private readonly log: Logger

  constructor(
    private readonly loggerFactory: LoggerFactory,
    private readonly metricsLogger: MetricsLogger,
    private readonly webServer: WebServer,
    private readonly responseSender: ResponseSender,
    private readonly userSender: UserSender,
    private readonly appManager: AppManager,
    private readonly hazelcastClientContainer: HazelcastClientContainer,
    @inject("db") private readonly db: Database,
    private readonly ddosManager: DDOSManager,
  ) {
    this.log = loggerFactory.createForClass(WorkerShutdown)
  }

  async shutdown(): Promise<void> {
    this.tryCatchedShutdown(this.metricsLogger)
    await this.asyncTryCatchedShutdown(this.webServer)
    this.tryCatchedShutdown(this.responseSender)
    this.tryCatchedShutdown(this.userSender)
    await this.asyncTryCatchedShutdown(this.appManager)
    await this.asyncTryCatchedShutdown(this.hazelcastClientContainer)
    await this.asyncTryCatchedShutdown(this.db)
    this.loggerFactory.shutdown()
    this.ddosManager.shutdown()
  }

  private async asyncTryCatchedShutdown(obj: { shutdown: () => Promise<void>; }) {
    try {
      await obj.shutdown()
    }
    catch (err) {
      this.log.log(LogLevel.ERROR, "", err)
    }
  }

  private tryCatchedShutdown(obj: { shutdown: () => void; }) {
    try {
      obj.shutdown()
    }
    catch (err) {
      this.log.log(LogLevel.ERROR, "", err)
    }
  }
}
