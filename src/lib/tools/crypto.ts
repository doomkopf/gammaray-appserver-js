import * as crypto from "crypto"

export function hashMD5(value: string): string {
  return crypto.createHash("md5").update(value).digest("base64")
}
