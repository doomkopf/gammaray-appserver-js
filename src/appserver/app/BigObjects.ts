import { inject, Lifecycle, scoped } from "tsyringe"
import { JsonObject } from "../api/core"
import { BigObjectRepository } from "../BigObjectRepository"

@scoped(Lifecycle.ContainerScoped)
export class BigObjects implements BigObjects {
  private readonly objects = new Map<string, JsonObject>()

  constructor(
    @inject("appId") private readonly appId: string,
    private readonly repo: BigObjectRepository,
  ) {
  }

  async init(): Promise<void> {
    const list = await this.repo.getObjectsList(this.appId)
    for (const id of list.ids) {
      const obj = await this.repo.getObject(this.appId, id)
      if (obj) {
        this.objects.set(id, obj)
      }
    }
  }

  getObject(id: string): JsonObject | undefined {
    return this.objects.get(id)
  }
}
