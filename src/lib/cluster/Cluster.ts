import { Client } from "hazelcast-client"
import { singleton } from "tsyringe"
import { nodeIdFromHazelcastMember } from "./hazelcast/hazelcast"
import { HazelcastClientContainer } from "./hazelcast/HazelcastClientContainer"

@singleton()
export class Cluster {
  private readonly hzClient: Client

  constructor(
    hzClientContainer: HazelcastClientContainer,
  ) {
    this.hzClient = hzClientContainer.client
  }

  nodeExists(id: string): boolean {
    const foundMembers = this.hzClient.getCluster().getMembers(member => nodeIdFromHazelcastMember(member) === id)
    return !!foundMembers[0]
  }

  findAllNodeIds(): string[] {
    return this.hzClient.getCluster().getMembers().map(member => {
      return nodeIdFromHazelcastMember(member)
    })
  }
}
