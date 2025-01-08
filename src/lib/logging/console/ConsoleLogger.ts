import { Logger } from "../Logger"
import { logLevelToString } from "../LoggerFactory"
import { LogLevel } from "../LogLevel"

const MAX_LOG_MESSAGE_LENGTH = 2000

const TEXT_COLOR_RESET = "\x1b[0m"
const TEXT_COLOR_DIM = "\x1b[2m"
const TEXT_COLOR_RED = "\x1b[31m"
const TEXT_COLOR_YELLOW = "\x1b[33m"
const TEXT_COLOR_WHITE = "\x1b[37m"
const TEXT_COLOR_GRAY = "\x1b[90m"

const TEXT_COLOR_ERROR = TEXT_COLOR_RESET + TEXT_COLOR_RED
const TEXT_COLOR_WARN = TEXT_COLOR_RESET + TEXT_COLOR_YELLOW
const TEXT_COLOR_DEBUG = TEXT_COLOR_RESET + TEXT_COLOR_GRAY + TEXT_COLOR_DIM
const TEXT_COLOR_INFO = TEXT_COLOR_RESET + TEXT_COLOR_WHITE

export class ConsoleLogger implements Logger {
  private readonly msgPrefix: string

  constructor(
    private readonly logLevel: LogLevel,
    nodeId: string,
    workerId: string,
    name: string,
  ) {
    this.msgPrefix = `${nodeId}:${workerId}:${name}`
  }

  isLevel(logLevel: LogLevel): boolean {
    return this.logLevel >= logLevel
  }

  log(logLevel: LogLevel, message: string, err?: Error): void {
    if (!this.isLevel(logLevel)) {
      return
    }

    if (logLevel === LogLevel.ERROR) {
      this.logMessage(logLevel, message, console.error, err)
    }
    else if (logLevel === LogLevel.WARN) {
      this.logMessage(logLevel, message, console.warn, err)
    }
    else if (logLevel === LogLevel.DEBUG) {
      this.logMessage(logLevel, message, console.debug, err)
    }
    else {
      this.logMessage(logLevel, message, console.log, err)
    }
  }

  private determineColor(logLevel: LogLevel): string {
    switch (logLevel) {
      case LogLevel.ERROR:
        return TEXT_COLOR_ERROR
      case LogLevel.WARN:
        return TEXT_COLOR_WARN
      case LogLevel.DEBUG:
        return TEXT_COLOR_DEBUG
      default:
        return TEXT_COLOR_INFO
    }
  }

  private logMessage(logLevel: LogLevel, message: string, fun: (message?: string, ...optParams: unknown[]) => void, err?: Error) {
    if (err) {
      fun(this.determineColor(logLevel), this.formatMessage(logLevel, message), err)
    }
    else {
      fun(this.determineColor(logLevel), this.formatMessage(logLevel, message))
    }
  }

  private formatMessage(logLevel: LogLevel, message: string): string {
    if (message.length > MAX_LOG_MESSAGE_LENGTH) {
      message = message.substring(0, MAX_LOG_MESSAGE_LENGTH)
      message += "(...)"
    }
    return `${logLevelToString(logLevel)}: ${this.msgPrefix}: ${message}`
  }
}
