export interface Database {
  get(key: string): Promise<string | null>

  put(key: string, value: string): Promise<void>

  remove(key: string): Promise<void>

  shutdown(): Promise<void>
}
