import { generateUuid } from "./uuid"

export async function sleep(millis: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, millis)
  })
}

export function arrayRemove<T>(arr: T[], elem: T): void {
  const i = arr.indexOf(elem)
  if (i !== -1) {
    arr.splice(i, 1)
  }
}

export function generateSessionId(): string {
  return generateUuid()
}

export function hashStringToNumber(value: string): number {
  let n = 0

  const buffer = Buffer.from(value)
  for (let i = 0; i < buffer.length; i++) {
    n += buffer[i] || 0
  }

  return Math.abs(n)
}

export function uuidFromMostLeastSigBits(mostSigBits: number, leastSigBits: number): string {
  const msb = BigInt(mostSigBits)
  const lsb = BigInt(leastSigBits)

  const _1 = padHex(((msb & 0xFFFFFFFF00000000n) >> 32n) & 0xFFFFFFFFn, 8n)
  const _2 = padHex(((msb & 0xFFFF0000n) >> 16n), 4n)
  const _3 = padHex((msb & 0x0000000000000000FFFFn), 4n)
  const _4 = padHex((((lsb & 0xFFFF000000000000n) >> 48n) & 0xFFFFn), 4n)
  const _5 = padHex(lsb & 0xFFFFFFFFFFFFn, 12n)

  return `${_1}_${_2}_${_3}_${_4}_${_5}`
}

function padHex(l: bigint, n: bigint): string {
  let s = l.toString(16)
  while (s.length < n) {
    s = `0${s}`
  }
  return s
}

export function entityFullKey(appId: string, entityType: string, entityId: string): string {
  return `${appId}_${entityType}_${entityId}`
}

export function calcWorkerId(entityKey: string, nodeWorkerIds: string[]): string {
  const workerHashedKey = hashStringToNumber(entityKey)
  return nodeWorkerIds[workerHashedKey % nodeWorkerIds.length]
}

const ALLOWED_CHARACTERS_ENTITY_ID = /^[A-Za-z0-9-_]*$/

export function isEntityIdValid(id: string): boolean {
  return !!id
    && id.length >= 3
    && id.length <= 128
    && ALLOWED_CHARACTERS_ENTITY_ID.test(id)
}
