import { ClusterMap, ClusterMapEntryEvent, ClusterMapEntryListener } from "../cluster/map/ClusterMap"

/**
 * A near cache or copy of the clusters state, which is updated through the global clusters events.
 * Some IMDGs support that already, but to be independent from technology, an own solution is used.
 */
export class ClusterLocalCache implements ClusterMapEntryListener {
  private readonly localMap = new Map<string, string | null>()

  constructor(
    private readonly globalMap: ClusterMap,
  ) {
    globalMap.setEntryListener(this)
  }

  entryPut(event: ClusterMapEntryEvent): void {
    this.localMap.set(event.key, event.value)
  }

  entryRemoved(event: ClusterMapEntryEvent): void {
    this.localMap.delete(event.key)
  }

  async get(key: string): Promise<string | null> {
    let value = this.localMap.get(key)
    if (value === undefined) {
      value = await this.globalMap.get(key)
      if (!value) {
        value = null
      }

      this.localMap.set(key, value)
    }

    return value
  }

  put(key: string, value: string): Promise<void> {
    this.localMap.set(key, value)
    return this.globalMap.put(key, value)
  }

  async putIfAbsent(key: string, value: string): Promise<string | null> {
    const currentVal = await this.globalMap.putIfAbsent(key, value)
    if (!currentVal) {
      this.localMap.set(key, value)
    }

    return currentVal
  }

  remove(key: string, value?: string): Promise<void> {
    this.localMap.delete(key)

    return this.globalMap.remove(key, value)
  }

  size(): Promise<number> {
    return this.globalMap.size()
  }
}
