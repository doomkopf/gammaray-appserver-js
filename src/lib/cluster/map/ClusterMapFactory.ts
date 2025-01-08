import { singleton } from "tsyringe"
import { HazelcastClientContainer } from "../hazelcast/HazelcastClientContainer"
import { ClusterMap } from "./ClusterMap"

@singleton()
export class ClusterMapFactory {
  constructor(
    private readonly hz: HazelcastClientContainer,
  ) {
  }

  create(name: string): ClusterMap {
    return new ClusterMap(this.hz.client.getMap(name))
  }
}
