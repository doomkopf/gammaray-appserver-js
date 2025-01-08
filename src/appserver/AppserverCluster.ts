import * as cluster from "cluster"
import { inject, singleton } from "tsyringe"
import { Cluster } from "../lib/cluster/Cluster"
import { JsonObject } from "./api/core"

export interface ClusterListener {
  onMessage(cmd: string, msg: JsonObject): void
}

export interface ClusterMessage {
  cmd: string
  msg: JsonObject | null
  /**
   * broadcast to all workers
   */
  wBroadcast: boolean
  nId: string | null
  wId: string | null
}

export enum RemoteNodeResult {
  OK,
  NOT_FOUND,
}

@singleton()
export class AppserverCluster {
  private listener!: ClusterListener

  constructor(
    @inject("nodeId") private readonly localNodeId: string,
    private readonly theCluster: Cluster,
  ) {
    if (!cluster.isWorker) {
      throw new Error("Cluster is supposed to be used by workers only")
    }

    process.on("message", message => {
      this.listener.onMessage(message.cmd, message.msg)
    })
  }

  set clusterListener(listener: ClusterListener) {
    this.listener = listener
  }

  private sendToLocalMaster(msg: ClusterMessage) {
    process.send?.(msg)
  }

  broadcast(cmd: string, msg: JsonObject): void {
    const clusterMessage: ClusterMessage = {
      cmd,
      msg,
      wBroadcast: true,
      nId: null,
      wId: null,
    }

    this.sendToLocalMaster(clusterMessage)
  }

  sendToNode(nodeId: string, workerId: string | null, cmd: string, msg: JsonObject): RemoteNodeResult {
    if (nodeId !== this.localNodeId && !this.theCluster.nodeExists(nodeId)) {
      return RemoteNodeResult.NOT_FOUND
    }

    this.sendToLocalMaster({
      cmd,
      msg,
      wBroadcast: false,
      nId: nodeId,
      wId: workerId,
    })

    return RemoteNodeResult.OK
  }

  getAllNodeIds(): string[] {
    return this.theCluster.findAllNodeIds()
  }
}
