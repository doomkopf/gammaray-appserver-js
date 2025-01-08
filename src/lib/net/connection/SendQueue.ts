import { Cache, CacheListener } from "../../cache/Cache"
import { CacheCleaner } from "../../cache/CacheCleaner"
import { Scheduler } from "../../schedule/Scheduler"
import { removeAnyValueFromCache } from "./connection"

export enum SendErrorType {
  ERROR, TIMEOUT,
}

export interface SendError {
  type: SendErrorType
  causedBy?: Error
}

export type SendCallback = (err?: SendError) => void

export interface SendQueueEntry {
  frame: string
  callback: SendCallback
}

export class SendQueue implements CacheListener<SendQueueEntry> {
  // a cache with a map structure is not optimal here
  private readonly cache: Cache<SendQueueEntry>
  private readonly cleaner: CacheCleaner

  private keyCounter = 0

  constructor(sendTimeoutMillis: number, scheduler: Scheduler) {
    this.cache = new Cache(sendTimeoutMillis, 100000, this)
    this.cleaner = new CacheCleaner(this.cache, scheduler, 500) // maybe 100 one day
  }

  onEntryEvicted(_key: string, value: SendQueueEntry): void {
    value.callback({ type: SendErrorType.TIMEOUT })
  }

  enqueue(elem: SendQueueEntry): void {
    this.cache.put(this.keyCounter.toString(), elem)

    if (++this.keyCounter > 999999) {
      this.keyCounter = 0
    }
  }

  poll(): SendQueueEntry | null {
    const value = removeAnyValueFromCache(this.cache)
    if (!value) {
      return null
    }

    return value
  }

  get hasEntries(): boolean {
    return this.cache.size > 0
  }

  shutdown(): void {
    this.cleaner.shutdown()
  }
}
