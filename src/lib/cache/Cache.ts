interface CacheEntry<V> {
  v: V
  ts: number
}

export interface CacheListener<V> {
  onEntryEvicted(key: string, value: V): void
}

export class Cache<V> {
  private readonly map = new Map<string, CacheEntry<V>>()

  constructor(
    private readonly entryEvictionTimeMillis: number,
    private readonly maxEntries: number,
    private listener?: CacheListener<V>,
  ) {
    if (entryEvictionTimeMillis <= 0) {
      throw new Error("entryEvictionTimeMillis must be > 0")
    }

    if (maxEntries <= 0) {
      throw new Error("maxEntries must be > 0")
    }
  }

  setListener(listener: CacheListener<V>): void {
    this.listener = listener
  }

  cleanup(): void {
    this.cleanupAt(Date.now())
  }

  cleanupAt(now: number): void {
    const keysToDelete: string[] = []
    for (const mapEntry of this.map.entries()) {
      const [key, entry] = mapEntry
      if (entry.ts + this.entryEvictionTimeMillis < now) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      const v = this.remove(key)
      if (v) {
        this.listener?.onEntryEvicted(key, v)
      }
    }
  }

  forEach(func: (key: string, value: V) => void): void {
    for (const entry of this.map.entries()) {
      func(entry[0], entry[1].v)
    }
  }

  get keyIterableIterator(): IterableIterator<string> {
    return this.map.keys()
  }

  put(key: string, value: V): void {
    this.putAt(key, value, Date.now())
  }

  putAt(key: string, value: V, now: number): void {
    const entry = this.map.get(key)
    if (entry) {
      entry.v = value
      entry.ts = now
      return
    }

    this.map.set(key, { v: value, ts: now })

    if (this.size > this.maxEntries) {
      let minKey: string | null = null
      let minTs = Number.MAX_VALUE

      for (const entry of this.map.entries()) {
        const [mk, v] = entry
        if (v.ts < minTs) {
          minTs = v.ts
          minKey = mk
        }
      }

      if (minKey) {
        const v = this.remove(minKey)
        if (v) {
          this.listener?.onEntryEvicted(key, v)
        }
      }
    }
  }

  get(key: string): V | null {
    return this.getAt(key, Date.now())
  }

  getAt(key: string, now: number): V | null {
    const entry = this.map.get(key)
    if (!entry) {
      return null
    }

    entry.ts = now

    return entry.v
  }

  remove(key: string): V | null {
    const value = this.map.get(key)
    if (value) {
      this.map.delete(key)
      return value.v
    }

    return null
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }
}
