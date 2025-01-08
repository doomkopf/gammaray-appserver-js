import { ReceptionSource } from "../connection/ReceptionSource"
import { responseCommand } from "./communication"

export class RequestContext {
  constructor(
    readonly source: ReceptionSource,
    private readonly requestId: string,
  ) {
  }

  respond(result: string): void {
    this.source.send(JSON.stringify(responseCommand(this.requestId, result)))
  }
}
