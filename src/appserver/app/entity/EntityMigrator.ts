import { Logger } from "../../../lib/logging/Logger"
import { LoggerFactory } from "../../../lib/logging/LoggerFactory"
import { LogLevel } from "../../../lib/logging/LogLevel"
import { EntityType } from "../../api/core"
import { AppEntity } from "./EntityContainer"

export class EntityMigrator {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    private readonly entityType: EntityType<never>,
    entityTypeName: string,
  ) {
    this.log = loggerFactory.createLogger(`EntityMigrator-${entityTypeName}`)
  }

  migrateEntityIfNecessary(entity: AppEntity): AppEntity {
    if (!this.entityType.migrate) {
      return entity
    }

    let version: number = entity._iv

    if (!version) {
      version = 1
    }

    if (version === this.entityType.currentVersion) {
      return entity
    }

    if (version > this.entityType.currentVersion) {
      this.log.log(LogLevel.ERROR, "Entity version bigger than the current one")
      return entity
    }

    for (version++; version <= this.entityType.currentVersion; version++) {
      try {
        entity = this.entityType.migrate[version](entity) as AppEntity
      }
      catch (err) {
        this.log.log(LogLevel.ERROR, `Error during migration to version ${version}`, err)
        throw err
      }
    }

    entity._iv = this.entityType.currentVersion

    return entity
  }
}
