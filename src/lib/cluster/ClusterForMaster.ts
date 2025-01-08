import { Cluster, Member } from "hazelcast-client"
import { retrieveLocalIPs } from "../tools/net"
import { nodeIdFromHazelcastMember } from "./hazelcast/hazelcast"
import { HazelcastClientContainer } from "./hazelcast/HazelcastClientContainer"

export interface ClusterMember {
  nodeId: string
  address: {
    host: string
    port: number
  };
}

export interface ClusterMembershipEvent {
  member: ClusterMember
}

export interface ClusterMembershipListener {
  memberAdded(event: ClusterMembershipEvent): void

  memberRemoved(event: ClusterMembershipEvent): void
}

export class ClusterForMaster {
  private readonly localIps = retrieveLocalIPs()
  private readonly hzCluster: Cluster

  constructor(
    hzContainer: HazelcastClientContainer,
    private readonly localHzProcessPort: number,
  ) {
    this.hzCluster = hzContainer.client.getCluster()
  }

  addMembershipListener(listener: ClusterMembershipListener): void {
    this.hzCluster.addMembershipListener({
      memberAdded(event) {
        listener.memberAdded({
          member: ClusterForMaster.mapMember(event.member),
        })
      },
      memberRemoved(event) {
        listener.memberRemoved({
          member: ClusterForMaster.mapMember(event.member),
        })
      },
    })
  }

  findAllMembers(): ClusterMember[] {
    return this.hzCluster.getMembers().map(hz => ClusterForMaster.mapMember(hz))
  }

  findLocalNodeId(): string | null {
    for (const member of this.hzCluster.getMembers()) {
      if (this.isMemberLocal(member)) {
        return nodeIdFromHazelcastMember(member)
      }
    }

    return null
  }

  private static mapMember(hzMember: Member): ClusterMember {
    const { host, port } = hzMember.address
    return {
      nodeId: nodeIdFromHazelcastMember(hzMember),
      address: { host, port },
    }
  }

  private isMemberLocal(member: Member): boolean {
    return this.localIps.indexOf(member.address.host) >= 0 && this.localHzProcessPort === member.address.port
  }
}
