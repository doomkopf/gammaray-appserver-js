export class RequestIdGenerator {
  private n = 0

  constructor(
    private readonly localIp: number,
    private readonly localPort: number,
  ) {
  }

  generate(): string {
    return `${this.localIp}:${this.localPort}:${this.nextNumber()}`
  }

  private nextNumber(): number {
    if (this.n >= 999999) {
      this.n = 0
    }
    return this.n++
  }
}
