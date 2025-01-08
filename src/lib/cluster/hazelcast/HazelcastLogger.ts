import { LogLevel as HzLogLevel, ILogger } from "hazelcast-client"
import { singleton } from "tsyringe"
import { Config } from "../../../appserver/Config"
import { Logger } from "../../logging/Logger"
import { LoggerFactory } from "../../logging/LoggerFactory"
import { LogLevel } from "../../logging/LogLevel"

@singleton()
export class HazelcastLogger implements ILogger {
  private readonly logger: Logger
  private readonly logDebugOnly: boolean

  constructor(
    loggerFactory: LoggerFactory,
    config: Config,
  ) {
    this.logger = loggerFactory.createLogger("ClusterManagerClient")
    this.logDebugOnly = config.getBoolean("hzLogDebugOnly")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(level: HzLogLevel, objectName: string, message: string, furtherInfo: any): void {
    this.logger.log(this.map(level), `${objectName} - ${message} - ${furtherInfo}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(objectName: string, message: string, furtherInfo?: any): void {
    this.log(HzLogLevel.ERROR, objectName, message, furtherInfo)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(objectName: string, message: string, furtherInfo?: any): void {
    this.log(HzLogLevel.WARN, objectName, message, furtherInfo)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(objectName: string, message: string, furtherInfo?: any): void {
    this.log(HzLogLevel.INFO, objectName, message, furtherInfo)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(objectName: string, message: string, furtherInfo?: any): void {
    this.log(HzLogLevel.DEBUG, objectName, message, furtherInfo)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace(objectName: string, message: string, furtherInfo?: any): void {
    this.log(HzLogLevel.TRACE, objectName, message, furtherInfo)
  }

  private map(ll: HzLogLevel): LogLevel {
    if (this.logDebugOnly) {
      return LogLevel.DEBUG
    }

    switch (ll) {
      case HzLogLevel.ERROR:
        return LogLevel.ERROR
      case HzLogLevel.WARN:
        return LogLevel.WARN
      case HzLogLevel.INFO:
        return LogLevel.INFO
      case HzLogLevel.DEBUG:
      case HzLogLevel.TRACE:
      case HzLogLevel.OFF:
      default:
        return LogLevel.DEBUG
    }
  }
}
