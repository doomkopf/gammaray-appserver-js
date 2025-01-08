import { ChildProcess, exec } from "child_process"
import { Config } from "../../../appserver/Config"
import { Logger } from "../../logging/Logger"
import { LogLevel } from "../../logging/LogLevel"

let process: ChildProcess

export async function startHazelcast(log: Logger, config: Config): Promise<{ processPort: number }> {
  const logDebugOnly = config.getBoolean("hzLogDebugOnly")

  process = exec("java -server --add-modules java.se --add-exports java.base/jdk.internal.ref=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED --add-opens java.base/java.nio=ALL-UNNAMED --add-opens java.base/sun.nio.ch=ALL-UNNAMED --add-opens java.management/sun.management=ALL-UNNAMED --add-opens jdk.management/com.sun.management.internal=ALL-UNNAMED -cp hazelcast/lib/hazelcast-5.4.0.jar com.hazelcast.core.server.HazelcastMemberStarter")

  return new Promise(resolve => {
    let logData = ""
    let isStarted = false
    process.stderr?.on("data", data => {
      const logDataChunk = data.toString()

      log.log(logDebugOnly ? LogLevel.DEBUG : LogLevel.INFO, logDataChunk)

      if (!isStarted) {
        logData += logDataChunk
        if (logData.indexOf("is STARTED") !== -1) {
          isStarted = true
          resolve({ processPort: parseProcessPort(logData) })
        }
      }
    })
  })
}

export function stopHazelcast(): void {
  process.kill()
}

function parseProcessPort(logData: string): number {
  let i = logData.indexOf("starting at")
  if (i === -1) {
    throw new Error("Could not determine hazelcast process port")
  }

  i += 11

  for (; i < logData.length; i++) {
    if (logData.charAt(i) === ":") {
      return Number(logData.substring(i + 1, i + 5))
    }
  }

  return 0
}
