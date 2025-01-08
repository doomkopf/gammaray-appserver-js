import { inject, singleton } from "tsyringe"
import { Config, LoggerType } from "../../appserver/Config"
import { ConsoleLogger } from "./console/ConsoleLogger"
import { Logger } from "./Logger"
import { LogLevel } from "./LogLevel"

function logLevelStringToType(logLevelString: string): LogLevel {
  switch (logLevelString) {
    case "DEBUG":
      return LogLevel.DEBUG
    case "INFO":
    default:
      return LogLevel.INFO
    case "WARN":
      return LogLevel.WARN
    case "ERROR":
      return LogLevel.ERROR
  }
}

export function logLevelToString(logLevel: LogLevel): string {
  switch (logLevel) {
    case LogLevel.DEBUG:
      return "DEBUG"
    case LogLevel.INFO:
    default:
      return "INFO"
    case LogLevel.WARN:
      return "WARN"
    case LogLevel.ERROR:
      return "ERROR"
  }
}

@singleton()
export class LoggerFactory {
  private readonly loggerType: LoggerType
  private readonly logLevel: LogLevel

  constructor(
    @inject("nodeId") private readonly nodeId: string,
    @inject("workerId") private readonly workerId: string,
    config: Config,
  ) {
    this.loggerType = config.getString("logger") as LoggerType
    this.logLevel = logLevelStringToType(config.getString("logLevel"))
  }

  async init(): Promise<void> {
    //
  }

  createLogger(name: string): Logger {
    switch (this.loggerType) {
      case "console":
      default:
        return new ConsoleLogger(this.logLevel, this.nodeId, this.workerId, name)
    }
  }

  createForClass(clazz: { name: string }): Logger {
    return this.createLogger(clazz.name)
  }

  shutdown(): void {
    //
  }
}
