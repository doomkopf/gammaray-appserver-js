import { delay, inject, Lifecycle, scoped } from "tsyringe"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { DeployAppResult } from "../admin-api"
import { FuncContext } from "../api/core"
import { AppManager } from "../AppManager"
import { Config } from "../Config"
import { deployAppScript } from "../general-usecases/deploy-app-script"
import { StatelessFunctions } from "./StatelessFunctions"

@scoped(Lifecycle.ContainerScoped)
export class AdminTools implements AdminTools {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    @inject(delay(() => AppManager)) private readonly appManager: AppManager,
    private readonly config: Config,
    private readonly statelessFunctions: StatelessFunctions,
  ) {
    this.log = loggerFactory.createForClass(AdminTools)
  }

  async deployApp(appId: string, script: string, pw: string, finFunc: string, ctx: FuncContext): Promise<void> {
    const result = await deployAppScript(
      this.log,
      this.appManager,
      this.config,
      { appId, pw, script },
    )

    const r: DeployAppResult = { success: result.status === "ok" }
    this.statelessFunctions.invoke(finFunc, r, ctx)
  }
}
