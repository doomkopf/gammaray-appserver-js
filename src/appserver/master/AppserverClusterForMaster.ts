import {
  ClusterForMaster,
  ClusterMember,
  ClusterMembershipEvent,
  ClusterMembershipListener,
} from "../../lib/cluster/ClusterForMaster"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Sender } from "../../lib/net/connection/Sender"
import { Scheduler } from "../../lib/schedule/Scheduler"
import { ClusterMessage } from "../AppserverCluster"
import { HAZELCAST_PORT_OFFSET } from "../constants"

export class AppserverClusterForMaster implements ClusterMembershipListener {
  private readonly log: Logger
  private readonly localNodeId: string

  private readonly remoteNodes = new Map<string, Sender>()

  constructor(
    private readonly loggerFactory: LoggerFactory,
    private readonly scheduler: Scheduler,
    cluster: ClusterForMaster,
  ) {
    this.log = loggerFactory.createForClass(AppserverClusterForMaster)

    const foundLocalNodeId = cluster.findLocalNodeId()

    if (!foundLocalNodeId) {
      throw new Error("No local nodeId could be determined from cluster members")
    }

    this.localNodeId = foundLocalNodeId

    this.log.log(LogLevel.INFO, `Determined ${this.localNodeId} as the local nodeId`)

    for (const member of cluster.findAllMembers()) {
      this.addRemoteNode(member)
    }

    this.logCurrentMembers()

    cluster.addMembershipListener(this)
  }

  memberAdded(event: ClusterMembershipEvent): void {
    const nodeId = this.addRemoteNode(event.member)

    if (nodeId) {
      this.log.log(LogLevel.INFO, `Node ${nodeId} has joined the cluster`)
      this.logCurrentMembers()
    }
  }

  memberRemoved(event: ClusterMembershipEvent): void {
    const sender = this.remoteNodes.get(event.member.nodeId)
    this.remoteNodes.delete(event.member.nodeId)
    if (sender) {
      sender.shutdown()
    }

    this.log.log(LogLevel.INFO, `Node ${event.member.nodeId} has left the cluster`)
    this.logCurrentMembers()
  }

  getLocalNodeId(): string {
    return this.localNodeId
  }

  sendToAllRemoteNodes(msg: ClusterMessage): void {
    const remoteNodeValues = this.remoteNodes.values()
    for (const remoteNode of remoteNodeValues) {
      remoteNode.send(JSON.stringify(msg))
    }
  }

  sendToRemoteNode(nodeId: string, msg: ClusterMessage): void {
    const remoteNode = this.remoteNodes.get(nodeId)
    if (!remoteNode) {
      this.log.log(LogLevel.ERROR, `Remote node ${nodeId} doesn't exist`)
      return
    }

    remoteNode.send(JSON.stringify(msg))
  }

  private addRemoteNode(member: ClusterMember): string | null {
    if (member.nodeId === this.localNodeId) {
      return null
    }

    const existingRemoteNode = this.remoteNodes.get(member.nodeId)
    if (existingRemoteNode) {
      existingRemoteNode.shutdown()
    }

    this.remoteNodes.set(member.nodeId, new Sender(
      this.loggerFactory,
      {
        host: member.address.host,
        port: member.address.port + HAZELCAST_PORT_OFFSET,
      },
      this.scheduler,
      2000,
    ))

    return member.nodeId
  }

  private logCurrentMembers() {
    let nodes = `${this.localNodeId} local,\n`
    for (const nodeId of this.remoteNodes.keys()) {
      nodes += `${nodeId},\n`
    }

    this.log.log(LogLevel.INFO, `Current cluster nodes:\n${nodes}`)
  }
}
