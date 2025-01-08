import { Cache, CacheListener } from "../../cache/Cache"
import { CacheCleaner } from "../../cache/CacheCleaner"
import { Scheduler } from "../../schedule/Scheduler"

export enum RequestErrorResultType {
  TIMEOUT = 1,
  ERROR = 2,
}

export interface RequestResult {
  error?: RequestErrorResultType
  data?: string
}

export type ResultCallback = (result: RequestResult) => void

export class ResultCallbacks implements CacheListener<ResultCallback> {
  private readonly cache: Cache<ResultCallback>
  private readonly cleaner: CacheCleaner

  constructor(requestTimeoutMillis: number, scheduler: Scheduler) {
    this.cache = new Cache(
      requestTimeoutMillis,
      100000,
      this)
    this.cleaner = new CacheCleaner(this.cache, scheduler, 500) // maybe 100 one day
  }

  onEntryEvicted(_key: string, callback: ResultCallback): void {
    callback({ error: RequestErrorResultType.TIMEOUT })
  }

  remove(requestId: string): ResultCallback | null {
    return this.cache.remove(requestId)
  }

  put(requestId: string, callback: ResultCallback): void {
    this.cache.put(requestId, callback)
  }

  shutdown(): void {
    this.cleaner.shutdown()
  }
}
