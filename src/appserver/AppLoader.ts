import { container, singleton } from "tsyringe"
import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { GammarayApp } from "./api/core"
import { App } from "./app/App"
import { BigObjects } from "./app/BigObjects"
import { EntityFunctions } from "./app/entity/EntityFunctions"
import { Lib } from "./app/Lib"
import { StatelessFunctions } from "./app/StatelessFunctions"
import { AppContainer } from "./AppContainer"

@singleton()
export class AppLoader {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
  ) {
    this.log = loggerFactory.createForClass(AppLoader)
  }

  async loadApp(id: string, script: string): Promise<AppContainer | null> {
    script = `${script}\napp;`

    try {
      const appRoot: GammarayApp = eval(script)

      const appContainer = container.createChildContainer()

      appContainer.register("appId", { useValue: id })
      appContainer.register("appRoot", { useValue: appRoot })

      // Late bindings to lib
      const entityFuncs = appContainer.resolve(EntityFunctions)
      const statelessFuncs = appContainer.resolve(StatelessFunctions)
      const lib = appContainer.resolve(Lib)
      entityFuncs.lateInit(lib)
      statelessFuncs.lateInit(lib)

      // Async inits
      await appContainer.resolve(BigObjects).init()

      return new AppContainer(appContainer, appContainer.resolve(App))
    }
    catch (err) {
      this.log.log(LogLevel.ERROR, `Error loading app with id: ${id}`, err)
      return null
    }
  }
}
