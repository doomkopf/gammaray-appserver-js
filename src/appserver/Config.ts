import { singleton } from "tsyringe"
import { readStringFile } from "../lib/tools/file"

export type ConfigProperty =
  "numWorkers"
  | "logger"
  | "logLevel"
  | "logRecvPayload"
  | "logSendPayload"
  | "databaseType"
  | "dbStoreFrequencyMillis"
  | "entityIntervalFrequencyMillis"
  | "fileDatabasePath"
  | "fileDatabaseExtension"
  | "userSessionCachesEvictionSeconds"
  | "httpPort"
  | "httpLoadbalancerType"
  | "entityEvictionTimeMillis"
  | "entityCacheMaxEntries"
  | "entityCacheCleanupDelayMillis"
  | "appDeploymentPassword"
  | "awsDynamoDbAccessKey"
  | "awsDynamoDbSecretKey"
  | "awsDynamoDbRegion"
  | "awsDynamoDbTableName"
  | "awsDynamoDbKeyName"
  | "awsDynamoDbValueName"
  | "ddosCheckEnabled"
  | "ddosMinAllowedMessageFrequencyMillis"
  | "ddosMessageThreshold"
  | "ddosClientBlockDurationMinutes"
  | "hzLogDebugOnly"

export type LoggerType = "console"

export type DatabaseType = "file" | "awsDynamoDb" | "distributedInMemory"

export type HttpLoadbalancerType = "none" | "aws"

const DEFAULT_VALUES: Record<ConfigProperty, string> = {
  numWorkers: "0",
  logger: "console",
  logLevel: "INFO",
  logRecvPayload: "false",
  logSendPayload: "false",
  databaseType: "distributedInMemory",
  dbStoreFrequencyMillis: "3000",
  entityIntervalFrequencyMillis: "400",
  fileDatabasePath: "data/",
  fileDatabaseExtension: "json",
  userSessionCachesEvictionSeconds: "3600",
  httpPort: "8080",
  httpLoadbalancerType: "none",
  entityEvictionTimeMillis: "600000",
  entityCacheMaxEntries: "100000",
  entityCacheCleanupDelayMillis: "60000",
  appDeploymentPassword: "thisdefaultpasswordshouldnotbeused",
  awsDynamoDbKeyName: "gamkey",
  awsDynamoDbValueName: "v",
  ddosCheckEnabled: "false",
  ddosMinAllowedMessageFrequencyMillis: "100",
  ddosMessageThreshold: "8",
  ddosClientBlockDurationMinutes: "10",
  awsDynamoDbAccessKey: "",
  awsDynamoDbSecretKey: "",
  awsDynamoDbRegion: "",
  awsDynamoDbTableName: "",
  hzLogDebugOnly: "true",
}

const PATH = "gammaray.cfg"

@singleton()
export class Config {
  private readonly configValues = new Map<string, string>()

  async init(): Promise<void> {
    const content = await readStringFile(PATH)
    if (!content) {
      return
    }

    const lines = content.split("\n")
    for (const line of lines) {
      if (!line) {
        continue
      }
      const kv = line.split("=")
      this.configValues.set(kv[0], kv[1])
    }
  }

  getString(prop: ConfigProperty): string {
    const value = this.configValues.get(prop)
    if (value === null || value === undefined) {
      return DEFAULT_VALUES[prop]
    }

    return value
  }

  getNumber(prop: ConfigProperty): number {
    return Number(this.getString(prop))
  }

  getBoolean(prop: ConfigProperty): boolean {
    return this.getString(prop) === "true"
  }
}
