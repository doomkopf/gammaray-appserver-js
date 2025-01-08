import { WebSocket } from "ws"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { PersistentLocalClientInfo, RequestContext } from "./http"

export class PersistentLocalClient implements RequestContext {
  private readonly log: Logger

  private _info: PersistentLocalClientInfo | null = null

  constructor(
    loggerFactory: LoggerFactory,
    private readonly logPayload: boolean,
    readonly id: string,
    private readonly ws: WebSocket,
    private readonly ip: string | null,
  ) {
    this.log = loggerFactory.createForClass(PersistentLocalClient)
  }

  getIp(): string | null {
    return this.ip
  }

  send(payload: string): void {
    this.ws.send(payload)
    if (this.logPayload && this.log.isLevel(LogLevel.DEBUG)) {
      this.log.log(LogLevel.DEBUG, `SEND-WS: ${payload}`)
    }
  }

  status(): void {
    this.log.log(LogLevel.WARN, "HTTP status not setable for websockets")
  }

  setHeader(): void {
    this.log.log(LogLevel.WARN, "HTTP header not setable for websockets")
  }

  close(): void {
    this.ws.close()
  }

  get info() {
    return this._info
  }

  set info(value) {
    this._info = value
  }
}
