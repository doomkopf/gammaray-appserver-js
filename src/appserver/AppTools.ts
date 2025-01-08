import { singleton } from "tsyringe"
import { hashMD5 } from "../lib/tools/crypto"
import { isEntityIdValid } from "../lib/tools/tools"
import { generateUuid, nameBasedUuid } from "../lib/tools/uuid"
import { EntityId } from "./api/core"
import { Tools } from "./api/tools"

@singleton()
export class AppTools implements Tools {
  generateEntityId(): EntityId {
    return generateUuid()
  }

  randomUUID(): string {
    return generateUuid()
  }

  nameBasedUUID(name: string): string {
    return nameBasedUuid(name)
  }

  hashMD5(str: string): string {
    return hashMD5(str)
  }

  currentTimeMillis(): number {
    return Date.now()
  }

  isValidEntityId(id: string): boolean {
    return isEntityIdValid(id)
  }
}
