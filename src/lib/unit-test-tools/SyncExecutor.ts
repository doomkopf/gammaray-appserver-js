import { Executor } from "../schedule/Executor"

export class SyncExecutor extends Executor {
  execute(func: () => void): void {
    func()
  }
}
