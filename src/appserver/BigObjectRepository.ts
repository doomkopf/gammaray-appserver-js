import { inject, singleton } from "tsyringe";
import { Database } from "../lib/db/Database";
import { JsonObject } from "./api/core";
import { bigObjectIdsListKey, bigObjectKey } from "./general-usecases/doc-keys";

export interface BigObjectIdsList {
  ids: string[];
}

@singleton()
export class BigObjectRepository {
  constructor(
    @inject("db") private readonly db: Database,
  ) {
  }

  async getObject(appId: string, id: string): Promise<JsonObject | null> {
    const data = await this.db.get(bigObjectKey(appId, id))
    if (!data) {
      return null
    }

    return JSON.parse(data)
  }

  async getObjectsList(appId: string): Promise<BigObjectIdsList> {
    const data = await this.db.get(bigObjectIdsListKey(appId))
    if (!data) {
      return { ids: [] }
    }

    return JSON.parse(data)
  }

  async store(appId: string, id: string, obj: JsonObject): Promise<void> {
    const list = await this.getObjectsList(appId)
    list.ids.push(id)

    await this.db.put(bigObjectKey(appId, id), JSON.stringify(obj))

    return this.db.put(bigObjectIdsListKey(appId), JSON.stringify(list))
  }
}
