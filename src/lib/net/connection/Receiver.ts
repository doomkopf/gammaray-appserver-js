import * as net from "net"
import { registerSocketReception } from "./connection"
import { ReceptionListener } from "./ReceptionListener"

export class Receiver {
  private readonly server: net.Server
  private readonly openSockets = new Set<net.Socket>()

  constructor(
    port: number,
    listener: ReceptionListener,
  ) {
    this.server = net.createServer(socket => {
      this.openSockets.add(socket)

      socket.on("close", () => {
        this.openSockets.delete(socket)
      })

      socket.on("error", () => {
        this.openSockets.delete(socket)
      })

      registerSocketReception(socket, listener)
    })
    this.server.listen(port)
  }

  shutdown(): Promise<void> {
    this.openSockets.forEach(s => s.destroy())
    this.openSockets.clear()

    return new Promise(resolve => {
      this.server.close(() => {
        resolve()
      })
    })
  }
}
