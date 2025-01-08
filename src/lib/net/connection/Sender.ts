import * as net from "net"
import { Logger } from "../../logging/Logger"
import { LoggerFactory } from "../../logging/LoggerFactory"
import { LogLevel } from "../../logging/LogLevel"
import { IntervalScheduledTask, Scheduler } from "../../schedule/Scheduler"
import { registerSocketReception, stringToTerminatedBuffer } from "./connection"
import { ReceptionListener } from "./ReceptionListener"
import { SendCallback, SendError, SendErrorType, SendQueue } from "./SendQueue"

export interface HostAddress {
  host: string
  port: number
}

export class Sender {
  private readonly log: Logger

  private socket: net.Socket | null = null
  private connected = false
  private readonly sendQueue: SendQueue
  private readonly connectTask: IntervalScheduledTask

  constructor(
    loggerFactory: LoggerFactory,
    private readonly address: HostAddress,
    private readonly scheduler: Scheduler,
    sendTimeoutMillis: number,
    private readonly listener?: ReceptionListener,
  ) {
    this.log = loggerFactory.createForClass(Sender)

    this.sendQueue = new SendQueue(sendTimeoutMillis, scheduler)

    this.connectTask = scheduler.scheduleInterval(() => this.checkSendQueueAndTryConnectAndSend(), 2000)
  }

  private get isConnected(): boolean {
    return !!this.socket && this.connected
  }

  private get isConnecting(): boolean {
    if (!this.socket) {
      return false
    }
    return this.socket.connecting
  }

  private async connectIfNotConnected(): Promise<boolean> {
    if (this.isConnected) {
      return true
    }

    if (this.isConnecting) {
      return false
    }

    const socket = new net.Socket()
    this.socket = socket

    return new Promise(resolve => {
      socket.on("close", () => {
        this.connected = false
      })

      socket.on("error", (err) => {
        this.log.log(LogLevel.INFO, `Socket error: ${err.name} -> ${err.message}`)
        this.connected = false
        resolve(false)
      })

      socket.on("timeout", () => {
        this.connected = false
        resolve(false)
      })

      socket.on("connect", () => {
        this.connected = true
        resolve(true)
      })

      if (this.listener) {
        registerSocketReception(socket, this.listener)
      }

      socket.connect(this.address.port, this.address.host)
    })
  }

  send(frame: string): Promise<SendError | undefined> {
    return new Promise(resolve => this.sendCallback(frame, err => resolve(err)))
  }

  private sendCallback(frame: string, callback: SendCallback): void {
    this.sendQueue.enqueue({ frame, callback })
    this.checkSendQueueAndTryConnectAndSend()
  }

  private async checkSendQueueAndTryConnectAndSend(): Promise<void> {
    if (!this.sendQueue.hasEntries) {
      return
    }

    if (!await this.connectIfNotConnected()) {
      return
    }

    this.sendDirectAllFromQueue()
  }

  private sendDirectAllFromQueue() {
    for (let entry = this.sendQueue.poll(); entry; entry = this.sendQueue.poll()) {
      this.sendDirect(entry.frame, entry.callback)
    }
  }

  private sendDirect(frame: string, callback: SendCallback) {
    this.socket?.write(stringToTerminatedBuffer(frame), err => {
      if (err) {
        callback({ type: SendErrorType.ERROR, causedBy: err })
      }
      else {
        callback()
      }
    })
  }

  shutdown(): void {
    this.scheduler.stopInterval(this.connectTask)
    this.sendQueue.shutdown()

    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }
}
