import { ReceptionListener } from "../connection/ReceptionListener"
import { ReceptionSource } from "../connection/ReceptionSource"
import { CommandHandler } from "./CommandHandler"
import { Command } from "./communication"
import { RequestContext } from "./RequestContext"
import { ResultCallbacks } from "./ResultCallbacks"

interface Logger {
  log(msg: string): void
}

export class CommandProcessor implements ReceptionListener {
  private readonly log: Logger

  constructor(
    loggerFactory: { create(name: string): Logger },
    private readonly commandHandlers: Map<number, CommandHandler>,
    private readonly resultCallbacks: ResultCallbacks,
  ) {
    this.log = loggerFactory.create(CommandProcessor.name)
  }

  onReceived(source: ReceptionSource, frame: string) {
    const cmd: Command = JSON.parse(frame)

    if (cmd.id) {
      const callback = this.resultCallbacks.remove(cmd.id)
      if (callback) {
        callback({ data: cmd.pl })
        return
      }
    }

    if (!cmd.cmd) {
      this.log.log(`Received invalid commmand: ${frame}`)
      return
    }

    const handler = this.commandHandlers.get(cmd.cmd)
    if (!handler) {
      this.log.log(`Unknown command: ${cmd.cmd}`)
      return
    }

    handler.handle(cmd.pl, cmd.id ? new RequestContext(source, cmd.id) : undefined)
  }
}
