import { Lifecycle, scoped } from "tsyringe"
import { CacheListener } from "../../../lib/cache/Cache"
import { LoggerFactory } from "../../../lib/logging/LoggerFactory"
import { Scheduler } from "../../../lib/schedule/Scheduler"
import { Config } from "../../Config"
import { EntitiesContainer } from "./EntitiesContainer"
import { EntityContainer } from "./EntityContainer"
import { EntityMigrator } from "./EntityMigrator"
import { EntityTypes } from "./EntityTypes"

export interface EntityTypeMetrics {
  loadedEntities: number
}

export interface EntityMetrics {
  entityTypes: { [type: string]: EntityTypeMetrics }
}

@scoped(Lifecycle.ContainerScoped)
export class EntitiesContainers {
  private readonly map = new Map<string, EntitiesContainer<never>>()

  constructor(
    loggerFactory: LoggerFactory,
    config: Config,
    scheduler: Scheduler,
    entityTypes: EntityTypes,
  ) {
    for (const entityTypeName of entityTypes.getTypeNames()) {
      const entityType = entityTypes.getType(entityTypeName)
      if (entityType) {
        this.map.set(entityTypeName, new EntitiesContainer(
          entityType,
          new EntityMigrator(loggerFactory, entityType, entityTypeName),
          config,
          scheduler,
        ))
      }
    }
  }

  setCacheListener(listener: CacheListener<EntityContainer>): void {
    for (const entityTypeContainer of this.map.values()) {
      entityTypeContainer.setCacheListener(listener)
    }
  }

  get(type: string): EntitiesContainer<never> | undefined {
    return this.map.get(type)
  }

  iterable(): Iterable<[type: string, container: EntitiesContainer<never>]> {
    return this.map.entries()
  }

  retrieveEntityTypeMetrics(): EntityMetrics {
    const metrics: EntityMetrics = {
      entityTypes: {},
    }

    for (const entry of this.map.entries()) {
      const [typeName, entityTypeContainer] = entry

      metrics.entityTypes[typeName] = {
        loadedEntities: entityTypeContainer.size,
      }
    }

    return metrics
  }

  shutdown(): void {
    for (const entityTypeContainer of this.map.values()) {
      entityTypeContainer.shutdown()
    }
  }
}
