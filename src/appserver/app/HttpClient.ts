import * as http from "http"
import * as https from "https"
import { Lifecycle, scoped } from "tsyringe"
import { FuncContext, JsonObject } from "../api/core"
import { HttpClient as ApiHttpClient, HttpClientResponse, HttpHeaders, HttpMethod } from "../api/http"
import { StatelessFunctions } from "./StatelessFunctions"

@scoped(Lifecycle.ContainerScoped)
export class HttpClient implements ApiHttpClient {
  constructor(
    private readonly statelessFunctions: StatelessFunctions,
  ) {
  }

  request(
    url: string,
    method: HttpMethod,
    body: string | null,
    headers: HttpHeaders,
    resultFunc: string,
    requestCtx: JsonObject | null,
    ctx: FuncContext,
  ): void {
    const httpLib = url.startsWith("https") ? https : http

    const clientHeaders: NodeJS.Dict<number | string | string[]> = {}
    if (headers) {
      for (const header of headers.headers) {
        clientHeaders[header.key] = header.value
      }
    }

    const request = httpLib.request(
      url,
      {
        method,
        headers: clientHeaders,
      },
      response => {
        let data = ""
        response.on("data", chunk => {
          data += chunk
        })
        response.on("end", () => {
          const clientResponse: HttpClientResponse = {
            requestCtx,
            httpResponse: {
              code: response.statusCode,
              body: data,
            },
          }
          this.statelessFunctions.invoke(resultFunc, clientResponse, ctx)
        })
      })

    if (body) {
      request.write(body)
    }
  }
}
