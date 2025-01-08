import { DependencyContainer } from "tsyringe"
import { App } from "./app/App"

export class AppContainer {
  constructor(
    private readonly diContainer: DependencyContainer,
    readonly app: App,
  ) {
  }

  async shutdown(): Promise<void> {
    await this.app.shutdown()

    this.diContainer.reset()
    this.diContainer.clearInstances()
  }
}
