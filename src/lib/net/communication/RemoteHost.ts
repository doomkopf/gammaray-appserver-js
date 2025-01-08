import { LoggerFactory } from "../../logging/LoggerFactory"
import { Scheduler } from "../../schedule/Scheduler"
import { ReceptionListener } from "../connection/ReceptionListener"
import { Sender } from "../connection/Sender"
import { SendErrorType } from "../connection/SendQueue"
import { requestCommand, sendCommand } from "./communication"
import { RequestIdGenerator } from "./RequestIdGenerator"
import { RequestErrorResultType, RequestResult, ResultCallback, ResultCallbacks } from "./ResultCallbacks"

export class RemoteHost {
  private readonly sender: Sender

  constructor(
    loggerFactory: LoggerFactory,
    private readonly resultCallbacks: ResultCallbacks,
    host: string,
    port: number,
    listener: ReceptionListener,
    private readonly requestIdGenerator: RequestIdGenerator,
    scheduler: Scheduler,
    sendTimeoutMillis: number,
  ) {
    this.sender = new Sender(loggerFactory, { host, port }, scheduler, sendTimeoutMillis, listener)
  }

  request(cmd: number, payload: string): Promise<RequestResult> {
    return new Promise(resolve => this.requestCallback(cmd, payload, (result) => resolve(result)))
  }

  private async requestCallback(cmd: number, payload: string, callback: ResultCallback): Promise<void> {
    const requestId = this.requestIdGenerator.generate()

    this.resultCallbacks.put(requestId, callback)

    const sendError = await this.sender.send(JSON.stringify(requestCommand(cmd, requestId, payload)))
    if (sendError) {
      const removedCallback = this.resultCallbacks.remove(requestId)
      if (removedCallback) {
        removedCallback({ error: this.mapError(sendError.type) })
      }
    }
  }

  private mapError(sendError: SendErrorType): RequestErrorResultType {
    switch (sendError) {
      case SendErrorType.TIMEOUT:
        return RequestErrorResultType.TIMEOUT
      case SendErrorType.ERROR:
      default:
        return RequestErrorResultType.ERROR
    }
  }

  send(cmd: number, payload: string): void {
    this.sender.send(JSON.stringify(sendCommand(cmd, payload)))
  }

  disconnect(): void {
    this.sender.shutdown()
  }
}
