import { singleton } from "tsyringe"
import { EntityFunctions } from "./entity/EntityFunctions"

@singleton()
export class AppShutdown {
  constructor(
    private readonly entityFunctions: EntityFunctions,
  ) {
  }

  async shutdown(): Promise<void> {
    await this.entityFunctions.shutdown()
  }
}
