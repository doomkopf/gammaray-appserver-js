import { FrameDecodeContext } from "./FrameDecodeContext"

const PI_BYTE1 = 207
const PI_BYTE2 = 128

const BUFFER_WITH_ENDING_PI_FIRST_BYTE = Buffer.from("test10")
BUFFER_WITH_ENDING_PI_FIRST_BYTE.writeUInt8(PI_BYTE1, 5)

const BUFFER_WITH_STARTING_PI_SECOND_BYTE_TERMINATED = Buffer.from("0test20")
BUFFER_WITH_STARTING_PI_SECOND_BYTE_TERMINATED.writeUInt8(PI_BYTE2, 0)
BUFFER_WITH_STARTING_PI_SECOND_BYTE_TERMINATED.writeUInt8(0, 6)

function stringToBufferReplacingSpaceWith0(str: string): Buffer {
  const buffer = Buffer.from(str)

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 32) {
      buffer[i] = 0
    }
  }

  return buffer
}

test("should decode", () => {
  const ctx = new FrameDecodeContext()

  let msgs = ctx.decode(stringToBufferReplacingSpaceWith0("test1 test2 "))
  expect(msgs).toHaveLength(2)
  expect(msgs[0]).toBe("test1")
  expect(msgs[1]).toBe("test2")

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0("test3 test4 tes"))
  expect(msgs).toHaveLength(2)
  expect(msgs[0]).toBe("test3")
  expect(msgs[1]).toBe("test4")

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0("t5"))
  expect(msgs).toHaveLength(0)

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0(" "))
  expect(msgs).toHaveLength(1)
  expect(msgs[0]).toBe("test5")

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0("te"))
  expect(msgs).toHaveLength(0)

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0("st"))
  expect(msgs).toHaveLength(0)

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0("6 "))
  expect(msgs).toHaveLength(1)
  expect(msgs[0]).toBe("test6")

  msgs = ctx.decode(stringToBufferReplacingSpaceWith0(""))
  expect(msgs).toHaveLength(0)

  msgs = ctx.decode(BUFFER_WITH_ENDING_PI_FIRST_BYTE)
  expect(msgs).toHaveLength(0)

  msgs = ctx.decode(BUFFER_WITH_STARTING_PI_SECOND_BYTE_TERMINATED)
  expect(msgs).toHaveLength(1)
  expect(msgs[0]).toBe("test1πtest2")
})
