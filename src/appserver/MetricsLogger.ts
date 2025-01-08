import { singleton } from "tsyringe"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { AppManager } from "./AppManager"
import { UserSessionContainer } from "./UserSessionContainer"
import { WebServer } from "./webserver/WebServer"

@singleton()
export class MetricsLogger {
  private readonly log: Logger
  private readonly task: NodeJS.Timeout

  constructor(
    loggerFactory: LoggerFactory,
    private readonly webServer: WebServer,
    private readonly userSessionContainer: UserSessionContainer,
    private readonly appManager: AppManager,
  ) {
    this.log = loggerFactory.createForClass(MetricsLogger)

    this.task = setInterval(() => {
      this.logMetrics()
    }, 300000)
  }

  private async logMetrics() {
    this.log.log(LogLevel.INFO,
      `${"<<<Metrics>>>"
      + "\nLocal client count: "}${await this.webServer.getPersistentLocalClientCount()
      }\nTotal logged in count: ${await this.userSessionContainer.getSessionCount()}`,
    )

    for (const appId of this.appManager.getLoadedAppIds()) {
      const app = this.appManager.getAppIfLoaded(appId)
      if (app) {
        this.log.log(LogLevel.INFO, `App <${appId}>:${JSON.stringify(app.retrieveAppMetrics())}`)
      }
    }
  }

  shutdown(): void {
    clearInterval(this.task)
  }
}
