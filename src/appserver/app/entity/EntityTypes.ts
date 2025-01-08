import { inject, Lifecycle, scoped } from "tsyringe"
import { EntityType, GammarayApp } from "../../api/core"
import { LISTS_ENTITY_TYPE } from "../../constants"
import { createListType } from "../ListFunctions"

/**
 * Encapsulated the app defined entity types + internal ones.
 */
@scoped(Lifecycle.ContainerScoped)
export class EntityTypes {
  private readonly types = new Map<string, EntityType<never>>()

  constructor(
    @inject("appRoot") appRoot: GammarayApp,
  ) {
    this.addTypesFromApp(appRoot)

    const listType = createListType()
    this.types.set(LISTS_ENTITY_TYPE, listType as unknown as EntityType<never>)
  }

  private addTypesFromApp(appRoot: GammarayApp) {
    for (const entityTypeName in appRoot.entity) {
      this.types.set(entityTypeName, appRoot.entity[entityTypeName] as unknown as EntityType<never>)
    }
  }

  getTypeNames(): Iterable<string> {
    return this.types.keys()
  }

  getType(name: string): EntityType<never> | undefined {
    return this.types.get(name)
  }
}
