import express from "express"
import { Request } from "express-serve-static-core"
import * as http from "http"
import { inject, singleton } from "tsyringe"
import { WebSocket } from "ws"
import { Cache } from "../../lib/cache/Cache"
import { CacheCleaner } from "../../lib/cache/CacheCleaner"
import { Logger } from "../../lib/logging/Logger"
import { LoggerFactory } from "../../lib/logging/LoggerFactory"
import { LogLevel } from "../../lib/logging/LogLevel"
import { Scheduler } from "../../lib/schedule/Scheduler"
import { generateUuid } from "../../lib/tools/uuid"
import { HttpMethod } from "../api/http"
import { Config, HttpLoadbalancerType } from "../Config"
import {
  BulkRequestListener,
  HTTP_BULK_API_PATH,
  HTTP_REST_API_PATH,
  HttpRequest,
  HttpRequestListener,
  PersistentLocalClientListener,
} from "./http"
import { PersistentLocalClient } from "./PersistentLocalClient"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const swagger = require("swagger-ui-express")

@singleton()
export class WebServer {
  private readonly log: Logger

  private server!: http.Server

  private readonly loadbalancerType: HttpLoadbalancerType

  private readonly persistentLocalClients = new Cache<PersistentLocalClient>(
    3600 * 1000,
    10000,
  )
  private readonly persistentLocalClientsCleaner: CacheCleaner

  private readonly logSendPayload: boolean

  constructor(
    private readonly loggerFactory: LoggerFactory,
    config: Config,
    @inject("httpPort") private readonly httpPort: number,
    @inject("BulkRequestListener") private readonly bulkRequestListener: BulkRequestListener,
    @inject("PersistentLocalClientListener") private readonly persistentLocalClientListener: PersistentLocalClientListener,
    @inject("HttpRequestListener") private readonly httpRequestListener: HttpRequestListener,
    scheduler: Scheduler,
  ) {
    this.log = loggerFactory.createForClass(WebServer)

    this.loadbalancerType = config.getString("httpLoadbalancerType") as HttpLoadbalancerType
    this.logSendPayload = config.getBoolean("logSendPayload")

    this.persistentLocalClientsCleaner = new CacheCleaner(this.persistentLocalClients, scheduler, 5 * 60 * 1000)
  }

  async start(): Promise<void> {
    const app = express()

    app.use(express.text({ type: "*/*" }))

    // For AWS ECS health check
    app.get("/", (_req, res) => {
      res.status(200)
      res.send()
    })

    app.use(
      "/swagger/:app",
      swagger.serve,
      (req, res) => {
        const html = swagger.generateHTML(null, {
          swaggerOptions: {
            url: `/api/${req.params.app}/openapi`,
          },
        })
        res.send(html)
      },
    )

    app.post(`/${HTTP_BULK_API_PATH}`, (req, res) => {
      this.bulkRequestListener.onBulkRequest(
        res,
        this.determineIpForHttp(req),
        req.body)
    })

    app.get(`/${HTTP_REST_API_PATH}/*`, (req, res) => {
      const httpRequest = parseHttpRequest(req, "GET")
      this.httpRequestListener.onHttpRequest(res, this.determineIpForHttp(req), httpRequest)
    })

    app.post(`/${HTTP_REST_API_PATH}/*`, (req, res) => {
      const httpRequest = parseHttpRequest(req, "POST")
      this.httpRequestListener.onHttpRequest(res, this.determineIpForHttp(req), httpRequest)
    })

    app.put(`/${HTTP_REST_API_PATH}/*`, (req, res) => {
      const httpRequest = parseHttpRequest(req, "PUT")
      this.httpRequestListener.onHttpRequest(res, this.determineIpForHttp(req), httpRequest)
    })

    app.patch(`/${HTTP_REST_API_PATH}/*`, (req, res) => {
      const httpRequest = parseHttpRequest(req, "PATCH")
      this.httpRequestListener.onHttpRequest(res, this.determineIpForHttp(req), httpRequest)
    })

    app.delete(`/${HTTP_REST_API_PATH}/*`, (req, res) => {
      const httpRequest = parseHttpRequest(req, "DELETE")
      this.httpRequestListener.onHttpRequest(res, this.determineIpForHttp(req), httpRequest)
    })

    this.server = http.createServer(app)

    this.createWebsocketServer()

    return new Promise(resolve => {
      this.server.listen(this.httpPort, resolve)
    })
  }

  private createWebsocketServer() {
    const wss = new WebSocket.Server({ server: this.server })
    wss.on("connection", (ws, req) => {
      let ip: string | null
      if (this.loadbalancerType === "aws") {
        ip = this.parseIpFromAwsHeaders(req.headers)
      }
      else {
        ip = req.socket.remoteAddress || null
      }

      const id = generateUuid()
      const client = new PersistentLocalClient(this.loggerFactory, this.logSendPayload, id, ws, ip)
      this.persistentLocalClients.put(id, client)

      this.persistentLocalClientListener.onPersistentLocalClientConnected(client)
      ws.on("error", err => {
        if (this.log.isLevel(LogLevel.DEBUG)) {
          this.log.log(LogLevel.DEBUG, "Websocket error: ", err)
        }
      })
      ws.on("close", () => {
        this.persistentLocalClientListener.onPersistentLocalClientDisconnected(client)
        this.persistentLocalClients.remove(id)
      })
      ws.on("message", message => {
        this.persistentLocalClientListener.onPersistentLocalClientReceived(client, message.toString())
      })
    })
  }

  private parseIpFromAwsHeaders(headers: http.IncomingHttpHeaders): string | null {
    try {
      return headers["x-forwarded-for"] as string
    }
    catch (err) {
      this.log.log(LogLevel.WARN, "", err)
    }

    return null
  }

  private determineIpForHttp(req: Request): string | null {
    if (this.loadbalancerType === "aws") {
      return this.parseIpFromAwsHeaders(req.headers)
    }
    else {
      // local ip (no loadbalancer)
    }

    return null
  }

  getPersistentLocalClientById(id: string): PersistentLocalClient | null {
    return this.persistentLocalClients.get(id)
  }

  async shutdown(): Promise<void> {
    this.persistentLocalClientsCleaner.shutdown()

    return new Promise(resolve => {
      this.server.close(err => {
        if (err) {
          this.log.log(LogLevel.ERROR, "Error shutting down express server: ", err)
        }
      })
      resolve() // This should be inside the close-callback, but calling close multiple times in multiple workers doesn't work
    })
  }

  async getPersistentLocalClientCount(): Promise<number> {
    return new Promise(resolve => {
      this.server.getConnections((err, count) => {
        if (err) {
          this.log.log(LogLevel.ERROR, "", err)
          resolve(-1)
          return
        }

        resolve(count)
      })
    })
  }
}

function parseHttpRequest(req: Request, method: HttpMethod): HttpRequest {
  let theBody: string | undefined
  if (method !== "GET" && method !== "DELETE") {
    const { body } = req
    theBody = body
  }

  return {
    path: req.params["0"],
    method,
    body: theBody,

    getHeader(name: string): string | undefined {
      return req.headers[name] as string
    },

    getParam(name: string): string | undefined {
      return req.query[name] as string
    },
  }
}
