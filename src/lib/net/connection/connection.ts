import * as net from "net"
import { Cache } from "../../cache/Cache"
import { FrameDecodeContext } from "./FrameDecodeContext"
import { ReceptionListener } from "./ReceptionListener"
import { ReceptionSource } from "./ReceptionSource"

export function stringToTerminatedBuffer(str: string): Uint8Array {
  const buffer = Buffer.from(`${str}0`)
  buffer.writeUInt8(0, buffer.length - 1)
  return buffer
}

export function splitBufferByTerminator(buffer: Uint8Array): Uint8Array[] {
  const parts: Uint8Array[] = []

  let lastI = 0
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) {
      parts.push(buffer.slice(lastI, i))
      lastI = i + 1
    }
  }

  parts.push(buffer.slice(lastI, buffer.length))

  return parts
}

export function registerSocketReception(socket: net.Socket, listener: ReceptionListener): void {
  const source = new ReceptionSource(socket)
  const ctx = new FrameDecodeContext()
  socket.on("data", data => {
    ctx.decode(data).forEach(frame => listener.onReceived(source, frame))
  })
}

export function removeAnyValueFromCache<V>(cache: Cache<V>): V | null {
  if (cache.size === 0) {
    return null
  }

  return cache.keyIterableIterator.next().value
}
