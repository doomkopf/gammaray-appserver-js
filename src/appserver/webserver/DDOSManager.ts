import { singleton } from "tsyringe"
import { Cache } from "../../lib/cache/Cache"
import { CacheCleaner } from "../../lib/cache/CacheCleaner"
import { Scheduler } from "../../lib/schedule/Scheduler"
import { Config } from "../Config"

interface ClientStats {
  lastMessageTs: number
  highFrequencyMessageCount: number
  isBlockedSinceTs?: number
}

@singleton()
export class DDOSManager {
  private readonly isEnabled: boolean
  private readonly ddosMinAllowedMessageFrequencyMillis: number
  private readonly ddosMessageThreshold: number
  private readonly ddosClientBlockDurationMillis: number

  private readonly clientStatsCache: Cache<ClientStats>
  private readonly cacheCleaner: CacheCleaner

  constructor(
    config: Config,
    scheduler: Scheduler,
  ) {
    this.isEnabled = config.getBoolean("ddosCheckEnabled")
    this.ddosMinAllowedMessageFrequencyMillis = config.getNumber("ddosMinAllowedMessageFrequencyMillis")
    this.ddosMessageThreshold = config.getNumber("ddosMessageThreshold")
    this.ddosClientBlockDurationMillis = config.getNumber("ddosClientBlockDurationMinutes") * 60 * 1000

    this.clientStatsCache = new Cache(this.ddosClientBlockDurationMillis + 2, 10000)
    this.cacheCleaner = new CacheCleaner(this.clientStatsCache, scheduler, 10 * 60 * 1000)
  }

  checkAndHandleDDOS(clientId: string): boolean {
    if (!this.isEnabled) {
      return false
    }

    const now = Date.now()

    let clientStats = this.clientStatsCache.get(clientId)
    if (!clientStats) {
      clientStats = {
        lastMessageTs: now,
        highFrequencyMessageCount: 0,
      }
      this.clientStatsCache.put(clientId, clientStats)
    }

    if (clientStats.isBlockedSinceTs && (clientStats.isBlockedSinceTs + this.ddosClientBlockDurationMillis) > now) {
      return true
    }

    if ((now - clientStats.lastMessageTs) < this.ddosMinAllowedMessageFrequencyMillis) {
      clientStats.highFrequencyMessageCount++
      if (clientStats.highFrequencyMessageCount >= this.ddosMessageThreshold) {
        clientStats.isBlockedSinceTs = now
      }
    }
    else {
      clientStats.highFrequencyMessageCount = 0
    }

    clientStats.lastMessageTs = now

    return false
  }

  shutdown(): void {
    this.cacheCleaner.shutdown()
  }
}
