import cluster from "cluster"
import os from "os"
import "reflect-metadata"
import { check } from "tcp-port-used"
import { ClusterForMaster } from "../../lib/cluster/ClusterForMaster"
import { startHazelcast, stopHazelcast } from "../../lib/cluster/hazelcast/hazelcast-process"
import { HazelcastClientContainer } from "../../lib/cluster/hazelcast/HazelcastClientContainer"
import { HazelcastLogger } from "../../lib/cluster/hazelcast/HazelcastLogger"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Receiver } from "../../lib/net/connection/Receiver"
import { Scheduler } from "../../lib/schedule/Scheduler"
import { calcWorkerId, entityFullKey } from "../../lib/tools/tools"
import { JsonObject } from "../api/core"
import { ClusterMessage } from "../AppserverCluster"
import { CCMD_INVOKE_ENTITY_FUNC, CCMD_SHUTDOWN_WORKER, InvokeEntityFunc } from "../ClusterHandler"
import { Config } from "../Config"
import { HAZELCAST_PORT_OFFSET } from "../constants"
import { AppserverClusterForMaster } from "./AppserverClusterForMaster"

export async function masterWorkerInit(): Promise<void> {
  const config = new Config()
  await config.init()

  const loggerFactory = new LoggerFactory("master", "master", config)
  const log = loggerFactory.createLogger("Gammaray-Master")

  log.log(LogLevel.INFO, "Starting cluster manager...")
  const hzInfo = await startHazelcast(log, config)
  log.log(LogLevel.INFO, "Cluster manager running")

  let appserverCluster: AppserverClusterForMaster
  let localNode: Receiver

  const workerIds: string[] = []

  const hzContainer = new HazelcastClientContainer(new HazelcastLogger(loggerFactory, config))

  try {
    await hzContainer.init()

    appserverCluster = new AppserverClusterForMaster(loggerFactory, new Scheduler(), new ClusterForMaster(hzContainer, hzInfo.processPort))

    const numWorkers = config.getNumber("numWorkers") || os.cpus().length
    log.log(LogLevel.INFO, `Starting ${numWorkers} workers`)

    for (let i = 0; i < numWorkers; i++) {
      workerIds.push(cluster.fork().id.toString())
    }

    localNode = new Receiver(hzInfo.processPort + HAZELCAST_PORT_OFFSET, {
      // Message was received from a remote node
      onReceived(source, cmsg) {
        const clusterMsg: ClusterMessage = JSON.parse(cmsg)

        if (clusterMsg.wBroadcast) {
          broadcastToLocalWorkers(log, clusterMsg, null)
        }
        else {
          sendToWorker(log, clusterMsg, workerIds)
        }
      },
    })
  }
  catch (error) {
    await hzContainer.shutdown()
    stopHazelcast()
    log.log(LogLevel.ERROR, "", error)
    return
  }

  const localNodeId = appserverCluster.getLocalNodeId()

  let httpPort = config.getNumber("httpPort")
  while (await check(httpPort)) {
    log.log(LogLevel.INFO, `HTTP port ${httpPort} is in use - trying ${++httpPort}`)
  }

  const msg: MasterInit = {
    nodeId: localNodeId,
    nodeWorkerIds: workerIds,
    httpPort,
  }
  broadcastToLocalWorkers(log, msg, null)

  // Message was received from a local worker
  cluster.on("message", (fromWorker, message) => {
    const clusterMsg: ClusterMessage = message

    if (clusterMsg.wBroadcast) {
      broadcastToLocalWorkers(log, clusterMsg, fromWorker)
      appserverCluster.sendToAllRemoteNodes(clusterMsg)
    }
    else if (clusterMsg.nId) {
      if (clusterMsg.nId === localNodeId) {
        sendToWorker(log, clusterMsg, workerIds)
      }
      else {
        appserverCluster.sendToRemoteNode(clusterMsg.nId, clusterMsg)
      }
    }
  })

  cluster.on("exit", worker => {
    log.log(LogLevel.INFO, `Worker exited ${worker.id}`)
  })

  process.on("SIGTERM", async () => {
    await localNode.shutdown()

    await hzContainer.shutdown()

    stopHazelcast()

    const shutdownMsg: ClusterMessage = {
      cmd: CCMD_SHUTDOWN_WORKER,
      msg: null,
      wBroadcast: false,
      nId: null,
      wId: null,
    }
    broadcastToLocalWorkers(log, shutdownMsg, null)
  })
}

export interface MasterInit {
  nodeId: string
  nodeWorkerIds: string[]
  httpPort: number
}

function sendToWorker(log: Logger, clusterMsg: ClusterMessage, workerIds: string[]) {
  if (clusterMsg.wId) {
    const worker = cluster.workers[clusterMsg.wId]
    if (!worker) {
      logWorkerNotFound(log, clusterMsg.wId)
      return
    }
    worker.send(clusterMsg)
  }
  else {
    if (clusterMsg.cmd === CCMD_INVOKE_ENTITY_FUNC) {
      const invokeEntityFunc = clusterMsg.msg as InvokeEntityFunc
      const workerId = calcWorkerId(
        entityFullKey(
          invokeEntityFunc.appId,
          invokeEntityFunc.entityType,
          invokeEntityFunc.entityId),
        workerIds)
      const worker = cluster.workers[workerId]
      if (!worker) {
        logWorkerNotFound(log, workerId)
        return
      }
      worker.send(clusterMsg)
    }
  }
}

function logWorkerNotFound(log: Logger, workerId: string) {
  log.log(LogLevel.WARN, `Worker ${workerId} could not be found anymore (possibly shutting down)`)
}

function broadcastToLocalWorkers(log: Logger, msg: JsonObject, currentWorker: cluster.Worker | null) {
  for (const id in cluster.workers) {
    const worker = cluster.workers[id]
    if (!worker) {
      log.log(LogLevel.ERROR, `Worker ${id} not found`)
      continue
    }
    if (currentWorker && worker.process.pid === currentWorker.process.pid) {
      continue
    }
    worker.send(msg)
  }
}
