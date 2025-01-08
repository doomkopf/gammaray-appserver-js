import { LogLevel } from "./LogLevel"

export interface Logger {
  isLevel(logLevel: LogLevel): boolean

  log(logLevel: LogLevel, message: string, err?: Error): void
}
