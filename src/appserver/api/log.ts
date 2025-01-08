export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

export interface Logger {
  log(logLevel: LogLevel, message: string): void
}
