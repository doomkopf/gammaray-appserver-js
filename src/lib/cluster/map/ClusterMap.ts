import { EntryEvent, IMap } from "hazelcast-client"

export interface ClusterMapEntryEvent {
  key: string
  value: string
}

export interface ClusterMapEntryListener {
  entryPut(event: ClusterMapEntryEvent): void

  entryRemoved(event: ClusterMapEntryEvent): void
}

export class ClusterMap {
  constructor(
    private readonly hzMapPromise: Promise<IMap<string, string>>,
  ) {
  }

  async setEntryListener(listener: ClusterMapEntryListener) {
    const map = await this.hzMapPromise
    map.addEntryListener({
      added: (entryEvent: EntryEvent<string, string>) => {
        listener.entryPut({ key: entryEvent.key, value: entryEvent.value })
      },

      removed: (entryEvent: EntryEvent<string, string>) => {
        listener.entryRemoved({ key: entryEvent.key, value: entryEvent.value })
      },

      updated: (entryEvent: EntryEvent<string, string>) => {
        listener.entryPut({ key: entryEvent.key, value: entryEvent.value })
      },

      evicted: (entryEvent: EntryEvent<string, string>) => {
        listener.entryRemoved({ key: entryEvent.key, value: entryEvent.value })
      },
    })
  }

  async get(key: string): Promise<string | null> {
    const map = await this.hzMapPromise
    return map.get(key)
  }

  async put(key: string, value: string): Promise<void> {
    const map = await this.hzMapPromise
    await map.put(key, value)
  }

  async putIfAbsent(key: string, value: string): Promise<string | null> {
    const map = await this.hzMapPromise
    return map.putIfAbsent(key, value)
  }

  async remove(key: string, value?: string): Promise<void> {
    const map = await this.hzMapPromise
    await map.remove(key, value)
  }

  async size(): Promise<number> {
    const map = await this.hzMapPromise
    return map.size()
  }
}
