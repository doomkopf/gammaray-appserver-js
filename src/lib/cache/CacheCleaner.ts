import { IntervalScheduledTask, Scheduler } from "../schedule/Scheduler"
import { Cache } from "./Cache"

export class CacheCleaner {
  private readonly cleanupTask: IntervalScheduledTask

  constructor(
    cache: Cache<unknown>,
    private readonly scheduler: Scheduler,
    intervalMs: number,
  ) {
    this.cleanupTask = scheduler.scheduleInterval(() => cache.cleanup(), intervalMs)
  }

  shutdown(): void {
    this.scheduler.stopInterval(this.cleanupTask)
  }
}
