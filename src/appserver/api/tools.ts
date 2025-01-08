import { EntityId } from "./core"

export interface Tools {
  generateEntityId(): EntityId

  randomUUID(): string

  nameBasedUUID(name: string): string

  hashMD5(str: string): string

  currentTimeMillis(): number

  /**
   * Checks whether a given string fulfills the constraints of a valid entity id that can be used for addressing entities.
   */
  isValidEntityId(id: string): boolean
}
