import { inject, singleton } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { AppManager } from "../AppManager"
import { AppserverCluster } from "../AppserverCluster"
import { ClusterHandler } from "../ClusterHandler"
import { ResponseSender } from "../ResponseSender"
import { UserSender } from "../UserSender"
import { WebServer } from "../webserver/WebServer"
import { WorkerShutdown } from "./WorkerShutdown"

@singleton()
export class WorkerRoot {
  private readonly log: Logger

  constructor(
    @inject("workerId") private readonly workerId: string,
    private readonly loggerFactory: LoggerFactory,
    private readonly webServer: WebServer,
    private readonly responseSender: ResponseSender,
    private readonly userSender: UserSender,
    private readonly appManager: AppManager,
    private readonly cluster: AppserverCluster,
    private readonly workerShutdown: WorkerShutdown,
  ) {
    this.log = loggerFactory.createForClass(WorkerRoot)
  }

  async run(): Promise<void> {
    new ClusterHandler(
      this.loggerFactory,
      this,
      this.cluster,
      this.appManager,
      this.responseSender,
      this.userSender,
      this.webServer,
    )

    await this.webServer.start()

    this.log.log(LogLevel.INFO, `<<<Gammaray worker ${this.workerId} running>>>`)
  }

  async shutdown(): Promise<void> {
    await this.workerShutdown.shutdown()

    this.log.log(LogLevel.INFO, `<<<Gammaray worker ${this.workerId} has shut down>>>`)

    process.exit()
  }
}
