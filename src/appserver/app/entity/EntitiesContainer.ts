import { Cache, CacheListener } from "../../../lib/cache/Cache"
import { CacheCleaner } from "../../../lib/cache/CacheCleaner"
import { Scheduler } from "../../../lib/schedule/Scheduler"
import { EntityType, JsonObject } from "../../api/core"
import { Config } from "../../Config"
import { EntityContainer } from "./EntityContainer"
import { EntityMigrator } from "./EntityMigrator"

export class EntitiesContainer<E extends JsonObject> {
  readonly entities: Cache<EntityContainer>
  private readonly entitiesCleaner: CacheCleaner

  constructor(
    readonly entityType: EntityType<E>,
    readonly migrator: EntityMigrator,
    config: Config,
    scheduler: Scheduler,
  ) {
    this.entities = new Cache<EntityContainer>(
      config.getNumber("entityEvictionTimeMillis"),
      config.getNumber("entityCacheMaxEntries"),
    )

    this.entitiesCleaner = new CacheCleaner(this.entities, scheduler, config.getNumber("entityCacheCleanupDelayMillis"))
  }

  setCacheListener(listener: CacheListener<EntityContainer>): void {
    this.entities.setListener(listener)
  }

  get size(): number {
    return this.entities.size
  }

  shutdown(): void {
    this.entitiesCleaner.shutdown()
  }
}
