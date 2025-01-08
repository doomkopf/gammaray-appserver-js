import * as zlib from "zlib"

export function base64zip(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    zlib.deflate(text, (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result.toString("base64"))
    })
  })
}

export function base64unzip(base64String: string): Promise<string> {
  return new Promise((resolve, reject) => {
    zlib.inflate(Buffer.from(base64String, "base64"), (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result.toString("utf8"))
    })
  })
}
