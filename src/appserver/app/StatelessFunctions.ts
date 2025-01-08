import { inject, Lifecycle, scoped } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { FuncContext, GammarayApp, JsonObject } from "../api/core"
import { ResponseSender } from "../ResponseSender"
import { sendFuncErrorToPotentialClient } from "../webserver/message"
import { DEAD_FUNC_CTX } from "./app-constants"
import { Lib } from "./Lib"

@scoped(Lifecycle.ContainerScoped)
export class StatelessFunctions {
  private readonly log: Logger

  private lib!: Lib

  constructor(
    loggerFactory: LoggerFactory,
    private readonly responseSender: ResponseSender,
    @inject("appId") private readonly appId: string,
    @inject("appRoot") private readonly appRoot: GammarayApp,
  ) {
    this.log = loggerFactory.createForClass(StatelessFunctions)
  }

  lateInit(lib: Lib): void {
    this.lib = lib
  }

  invoke(func: string, payload: JsonObject | null, ctx: FuncContext): void {
    const statelessFunc = this.appRoot.func[func]
    if (!statelessFunc) {
      const msg = `Unknown func: appId=${this.appId} func=${func}`
      this.log.log(LogLevel.WARN, msg)
      if (ctx.requestId) {
        sendFuncErrorToPotentialClient(this.responseSender, ctx.requestId, "", func, msg)
      }
      return
    }

    try {
      const start = Date.now()

      statelessFunc.func(this.lib, payload as never, ctx)

      const duration = Date.now() - start
      if (duration > 100) {
        this.log.log(LogLevel.WARN, `Stateless func ${func} took ${duration}ms`)
      }
    }
    catch (err) {
      this.log.log(LogLevel.ERROR, `Error in stateless func ${func}`, err)
      if (ctx.requestId) {
        sendFuncErrorToPotentialClient(this.responseSender, ctx.requestId, "", func, err.message)
      }
    }
  }

  onUserLoggedOut(userId: string): void {
    // internal/experimental function that is not supposed to be used by the public yet - it exists, but is not specified in the API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onLogout = (this.appRoot as any).onUserLoggedOut
    if (onLogout) {
      try {
        onLogout(this.lib, userId, DEAD_FUNC_CTX)
      }
      catch (err) {
        this.log.log(LogLevel.ERROR, "Error in onUserLoggedOut", err)
      }
    }
  }
}
