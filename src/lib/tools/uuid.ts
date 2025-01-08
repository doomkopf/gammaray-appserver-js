import { v4, validate } from "uuid"
import getUuid from "uuid-by-string"

export function generateUuid(): string {
  return v4()
}

export function isUuid(value: string): boolean {
  return validate(value)
}

export function nameBasedUuid(name: string): string {
  return getUuid(name)
}
