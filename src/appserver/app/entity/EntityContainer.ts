export interface AppEntity {
  _iv: number
}

export interface EntityContainer {
  e: AppEntity | null
  type: string
  dirty: boolean
}
