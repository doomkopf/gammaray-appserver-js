import * as fs from "fs"
import { readStringFile } from "../../tools/file"
import { Database } from "../Database"

export class FileDatabase implements Database {
  constructor(
    private readonly path: string,
    private readonly extension: string,
  ) {
  }

  private keyToPath(key: string): string {
    return `${this.path + key}.${this.extension}`
  }

  get(key: string): Promise<string | null> {
    return readStringFile(this.keyToPath(key))
  }

  put(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.keyToPath(key), value, err => {
        if (err) {
          setImmediate(() => reject(err))
          return
        }

        setImmediate(() => resolve())
      })
    })
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      fs.unlink(this.keyToPath(key), err => {
        if (err) {
          // not important since file systems are too specific and won't be used in prod
          setImmediate(() => resolve())
          return
        }

        setImmediate(() => resolve())
      })
    })
  }

  async shutdown(): Promise<void> {
    //
  }
}
