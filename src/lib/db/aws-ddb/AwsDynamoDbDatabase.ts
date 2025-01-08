import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb"
import { Database } from "../Database"

export class AwsDynamoDbDatabase implements Database {
  private readonly client: DynamoDBClient

  constructor(
    private readonly tableName: string,
    private readonly ddbKeyName: string,
    private readonly ddbValueName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async get(key: string): Promise<string | null> {
    const out = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: { [this.ddbKeyName]: { S: key } },
    }))
    if (!out.Item) {
      return null
    }

    return out.Item[this.ddbValueName].S || null
  }

  async put(key: string, value: string): Promise<void> {
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: {
        [this.ddbKeyName]: { S: key },
        [this.ddbValueName]: { S: value },
      },
    }))
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteItemCommand({
      TableName: this.tableName,
      Key: { [this.ddbKeyName]: { S: key } },
    }))
  }

  async shutdown(): Promise<void> {
    this.client.destroy()
  }
}
