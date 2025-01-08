import { Lifecycle, scoped } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Logger as ApiLogger, LogLevel as ApiLogLevel } from "../api/log"

@scoped(Lifecycle.ContainerScoped)
export class AppLogger implements ApiLogger {
  private readonly logger: Logger

  constructor(
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.createForClass(AppLogger)
  }

  log(logLevel: ApiLogLevel, message: string): void {
    this.logger.log(this.mapLogLevel(logLevel), message)
  }

  private mapLogLevel(logLevel: ApiLogLevel): LogLevel {
    switch (logLevel) {
      case ApiLogLevel.DEBUG:
        return LogLevel.DEBUG
      case ApiLogLevel.INFO:
        return LogLevel.INFO
      case ApiLogLevel.WARN:
        return LogLevel.WARN
      case ApiLogLevel.ERROR:
      default:
        return LogLevel.ERROR
    }
  }
}
