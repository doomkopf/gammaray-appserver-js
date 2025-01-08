import { inject, singleton } from "tsyringe";
import { Database } from "../lib/db/Database";
import { appScriptKey } from "./general-usecases/doc-keys";

interface AppScriptEntity {
  script: string;
}

@singleton()
export class AppScriptRepository {
  constructor(
    @inject("db") private readonly db: Database,
  ) {
  }

  async getAppScript(appId: string): Promise<string | null> {
    const value = await this.db.get(appScriptKey(appId))
    if (!value) {
      return null
    }

    const entity: AppScriptEntity = JSON.parse(value)

    return entity.script
  }

  async storeAppScript(appId: string, script: string): Promise<void> {
    const entity: AppScriptEntity = {
      script,
    }
    return this.db.put(appScriptKey(appId), JSON.stringify(entity))
  }
}
