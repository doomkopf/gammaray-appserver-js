import { DependencyContainer } from "tsyringe"
import { ClusterMapFactory } from "../lib/cluster/map/ClusterMapFactory"
import { AwsDynamoDbDatabase } from "../lib/db/aws-ddb/AwsDynamoDbDatabase"
import { ChunkedWrapperDatabase } from "../lib/db/chunked-wrapper/ChunkedWrapperDatabase"
import { Database } from "../lib/db/Database"
import { DistributedInMemoryDatabase } from "../lib/db/distributedinmemory/DistributedInMemoryDatabase"
import { FileDatabase } from "../lib/db/file/FileDatabase"
import { Config, DatabaseType } from "./Config"

export function createDatabase(dependencyContainer: DependencyContainer): Database | null {
  const config = dependencyContainer.resolve(Config)
  //const loggerFactory = dependencyContainer.resolve(LoggerFactory)
  const databaseType = config.getString("databaseType") as DatabaseType

  switch (databaseType) {
    case "file":
      return new FileDatabase(
        config.getString("fileDatabasePath"),
        config.getString("fileDatabaseExtension"),
      )

    case "awsDynamoDb":
      return new ChunkedWrapperDatabase(new AwsDynamoDbDatabase(
        config.getString("awsDynamoDbTableName"),
        config.getString("awsDynamoDbKeyName"),
        config.getString("awsDynamoDbValueName"),
        config.getString("awsDynamoDbRegion"),
        config.getString("awsDynamoDbAccessKey"),
        config.getString("awsDynamoDbSecretKey"),
      ), 320000)

    case "distributedInMemory":
      return new DistributedInMemoryDatabase(dependencyContainer.resolve(ClusterMapFactory))
  }
}
