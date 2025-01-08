import { Client } from "hazelcast-client"
import { singleton } from "tsyringe"
import { HazelcastLogger } from "./HazelcastLogger"

@singleton()
export class HazelcastClientContainer {
  private hazelcastClient!: Client

  constructor(
    private readonly hzLogger: HazelcastLogger,
  ) {
  }

  async init(): Promise<void> {
    this.hazelcastClient = await Client.newHazelcastClient({
      clusterName: "gammaray",
      customLogger: this.hzLogger,
      network: {
        clusterMembers: ["127.0.0.1:5001"],
      },
    })
  }

  get client(): Client {
    return this.hazelcastClient
  }

  async shutdown(): Promise<void> {
    if (this.hazelcastClient) {
      await this.hazelcastClient.shutdown()
    }
  }
}
