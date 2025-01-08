import { splitBufferByTerminator } from "./connection"

const EMPTY_BUFFER: Uint8Array = Buffer.alloc(0)

export class FrameDecodeContext {
  private last = EMPTY_BUFFER

  decode(data: Uint8Array): string[] {
    if (data.length === 0) {
      return []
    }

    const parts = splitBufferByTerminator(data)
    if (parts.length === 0) {
      return []
    }

    const [first] = parts
    this.last = Buffer.concat([this.last, first])

    if (parts.length === 1) {
      return []
    }

    const msgs: string[] = []

    if (this.last.length > 0) {
      msgs.push(this.last.toString())
      this.last = EMPTY_BUFFER
    }

    for (let i = 1; i < parts.length - 1; i++) {
      msgs.push(parts[i].toString())
    }

    const last = parts[parts.length - 1]
    if (last) {
      this.last = last
    }

    return msgs
  }
}
