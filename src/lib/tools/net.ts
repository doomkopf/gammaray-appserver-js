import * as os from "os"

export function retrieveLocalIPs(): string[] {
  const nis = os.networkInterfaces()
  const addresses: string[] = []
  for (const id in nis) {
    const ni = nis[id]
    if (ni) {
      for (const info of ni) {
        if (info.internal || info.family !== "IPv4") {
          continue
        }
        addresses.push(info.address)
      }
    }
  }

  return addresses
}
