import { Database } from "../Database"

const VALUE_SEPARATOR = "|>gam<|"
const NEXT_KEY_SIZE = VALUE_SEPARATOR.length + 64 + VALUE_SEPARATOR.length
const MIN_VALUE_SIZE = NEXT_KEY_SIZE + 1

interface Chunk {
  key: string
  value: string
  nextKey?: string
}

/**
 * A wrapper or adapter that can be wrapped around any Database implementation in case it has document size limitations.
 * Each value will then be split into multiple documents automatically.
 */
export class ChunkedWrapperDatabase implements Database {
  private readonly valueSizePerDoc: number

  constructor(
    private readonly db: Database,
    maxValueSizePerDoc: number,
  ) {
    if (maxValueSizePerDoc < MIN_VALUE_SIZE) {
      throw new Error(`Min value for maxValueSizePerDoc is ${MIN_VALUE_SIZE}`)
    }

    this.valueSizePerDoc = maxValueSizePerDoc - NEXT_KEY_SIZE
  }

  async get(key: string): Promise<string | null> {
    const value = await this.db.get(key)
    if (!value) {
      return null
    }

    return this.recGet("", value, key)
  }

  async put(key: string, value: string): Promise<void> {
    if (value.length > this.valueSizePerDoc) {
      return this.putChunks(key, value)
    }

    return this.db.put(key, value)
  }

  remove(key: string): Promise<void> {
    return this.recRemove(key)
  }

  private async recRemove(key: string): Promise<void> {
    const value = await this.db.get(key)
    if (!value) {
      return
    }

    if (value.startsWith(VALUE_SEPARATOR)) {
      const values = value.split(VALUE_SEPARATOR)
      const [, nextKey] = values
      if (nextKey === key) {
        throw new Error(`Remove: The next key refers to the same key again which would result in an endless recursion - key=${nextKey}`)
      }
      await this.recRemove(nextKey)
    }

    await this.db.remove(key)
  }

  shutdown(): Promise<void> {
    return this.db.shutdown()
  }

  private splitIntoChunks(key: string, value: string): Chunk[] {
    let chunkCount = Math.floor(value.length / this.valueSizePerDoc)
    if ((value.length % this.valueSizePerDoc) > 0) {
      chunkCount++
    }
    const chunksToPut: Chunk[] = []
    let i = 0
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
      const remaining = Math.min(this.valueSizePerDoc, value.length - i)
      const chunkValue = value.substring(i, i + remaining)
      i += remaining

      const chunk: Chunk = {
        key: key + (chunkIndex == 0 ? "" : (`_${chunkIndex - 1}`)),
        value: chunkValue,
      }

      if ((chunkIndex + 1) !== chunkCount) {
        chunk.nextKey = `${key}_${chunkIndex}`
      }

      chunksToPut.push(chunk)
    }

    return chunksToPut
  }

  private async putChunks(key: string, value: string) {
    const chunks = this.splitIntoChunks(key, value)
    const promises: Promise<void>[] = []
    for (let i = chunks.length - 1; i > 0; i--) {
      promises.push(this.putChunk(chunks[i]))
    }

    for (const p of promises) {
      await p
    }

    return this.putChunk(chunks[0])
  }

  private putChunk(chunk: Chunk): Promise<void> {
    let chunkValue: string
    if (chunk.nextKey) {
      chunkValue = VALUE_SEPARATOR + chunk.nextKey + VALUE_SEPARATOR + chunk.value
    }
    else {
      chunkValue = chunk.value
    }
    return this.db.put(chunk.key, chunkValue)
  }

  private async recGet(fullValue: string, valueToProcess: string, usedKey: string): Promise<string> {
    if (!valueToProcess.startsWith(VALUE_SEPARATOR)) {
      return fullValue + valueToProcess
    }

    const values = valueToProcess.split(VALUE_SEPARATOR)
    const [, nextKey, chunkValue] = values
    if (nextKey === usedKey) {
      throw new Error(`Get: The next key refers to the same key again which would result in an endless recursion - key=${nextKey}`)
    }

    const nextChunkValue = await this.db.get(nextKey)
    if (!nextChunkValue) {
      throw new Error(`ChunkedWrapperDatabase: Error reading next chunk with key ${nextKey} - returned null`)
    }

    return this.recGet(fullValue + chunkValue, nextChunkValue, nextKey)
  }
}
