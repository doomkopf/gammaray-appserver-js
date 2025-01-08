import cluster from "cluster"
import { container, instanceCachingFactory, Lifecycle } from "tsyringe"
import { HazelcastClientContainer } from "../../lib/cluster/hazelcast/HazelcastClientContainer"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { Config } from "../Config"
import { createDatabase } from "../db-factory"
import { MasterInit } from "../master/master-worker"
import { BulkRequestHandler } from "../webserver/BulkRequestHandler"
import { HttpRequestHandler } from "../webserver/HttpRequestHandler"
import { PersistentLocalClientHandler } from "../webserver/PersistentLocalClientHandler"
import { WorkerRoot } from "./WorkerRoot"

export function workerInit(): void {
  process.on("unhandledRejection", error => {
    console.error(error)
  })

  const workerId = cluster.worker.id.toString()
  process.once("message", async message => {
    const msg: MasterInit = message
    const worker = await createWorkerRoot(msg.nodeId, msg.nodeWorkerIds, workerId, msg.httpPort)
    worker.run()
  })
}

async function createWorkerRoot(
  nodeId: string,
  nodeWorkerIds: string[],
  workerId: string,
  httpPort: number,
): Promise<WorkerRoot> {
  container.register("nodeId", { useValue: nodeId })
  container.register("nodeWorkerIds", { useValue: nodeWorkerIds })
  container.register("workerId", { useValue: workerId })
  container.register("httpPort", { useValue: httpPort })
  container.register("db", { useFactory: instanceCachingFactory(createDatabase) })

  // async inits
  await container.resolve(Config).init()
  await container.resolve(LoggerFactory).init()
  await container.resolve(HazelcastClientContainer).init()

  return container.resolve(WorkerRoot)
}

// Interface registrations
const singletonLifecycle = { lifecycle: Lifecycle.Singleton }
container.register("BulkRequestListener", { useClass: BulkRequestHandler }, singletonLifecycle)
container.register("PersistentLocalClientListener", { useClass: PersistentLocalClientHandler }, singletonLifecycle)
container.register("HttpRequestListener", { useClass: HttpRequestHandler }, singletonLifecycle)
