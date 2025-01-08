import { singleton } from "tsyringe"

@singleton()
export class Executor {
  execute(func: () => void): void {
    setImmediate(func)
  }
}
