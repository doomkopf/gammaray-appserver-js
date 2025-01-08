import * as net from "net"
import { stringToTerminatedBuffer } from "./connection"

export class ReceptionSource {
  constructor(
    private readonly socket: net.Socket,
  ) {
  }

  send(frame: string): void {
    this.socket.write(stringToTerminatedBuffer(frame))
  }
}
