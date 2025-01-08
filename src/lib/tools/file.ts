import * as fs from "fs"

export function readStringFile(path: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          setImmediate(() => resolve(null))
          return
        }

        setImmediate(() => reject(err))
        return
      }

      if (!data) {
        setImmediate(() => resolve(null))
        return
      }

      setImmediate(() => resolve(data.toString()))
    })
  })
}
