import { singleton } from "tsyringe"

export type OnceScheduledTask = NodeJS.Timeout
export type IntervalScheduledTask = NodeJS.Timeout

@singleton()
export class Scheduler {
  scheduleOnce(func: () => void, ms: number): OnceScheduledTask {
    return setTimeout(func, ms)
  }

  scheduleInterval(func: () => void, ms: number): IntervalScheduledTask {
    return setInterval(func, ms)
  }

  stopOnce(task: OnceScheduledTask): void {
    clearTimeout(task)
  }

  stopInterval(task: IntervalScheduledTask): void {
    clearInterval(task)
  }
}
