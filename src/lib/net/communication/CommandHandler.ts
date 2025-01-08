import { RequestContext } from "./RequestContext"

export interface CommandHandler {
  handle(payload: string, ctx?: RequestContext): void
}
