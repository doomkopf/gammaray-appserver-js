import { ReceptionSource } from "./ReceptionSource"

export interface ReceptionListener {
  onReceived(source: ReceptionSource, frame: string): void
}
