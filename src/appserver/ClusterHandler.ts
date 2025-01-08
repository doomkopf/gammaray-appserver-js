import { Logger } from "../lib/logging/Logger"
import { LoggerFactory } from "../lib/logging/LoggerFactory"
import { LogLevel } from "../lib/logging/LogLevel"
import { JsonObject } from "./api/core"
import { HttpResponseData } from "./api/http"
import { AppManager } from "./AppManager"
import { AppserverCluster, ClusterListener } from "./AppserverCluster"
import { FuncContextImpl } from "./FuncContextImpl"
import { RequestSourceWorker, ResponseSender } from "./ResponseSender"
import { UserSender } from "./UserSender"
import { WebServer } from "./webserver/WebServer"
import { WorkerRoot } from "./worker/WorkerRoot"

export const CCMD_SHUTDOWN_WORKER = "sw"
export const CCMD_SHUTDOWN_APP = "sa"
export const CCMD_INVOKE_ENTITY_FUNC = "ef"
export const CCMD_SEND_RESPONSE = "sr"
export const CCMD_SEND_TO_USER = "su"
export const CCMD_LOGIN_PERSISTENT_LOCAL_CLIENT = "ll"
export const CCMD_REMOVE_PERSISTENT_LOCAL_CLIENT = "rl"

export interface AppMaintenance {
  id: string
}

export interface InvokeEntityFunc {
  appId: string
  requestId: string | null
  persistentLocalClientId: string | null
  userId: string | null
  func: string
  entityType: string
  entityId: string
  payload: JsonObject | null
  rs: RequestSourceWorker
}

export interface SendResponse {
  rId: string
  data: JsonObject
  httpData?: HttpResponseData
}

export interface SendToUser {
  uId: string
  data: JsonObject
}

export interface LoginPersistentLocalClient {
  appId: string
  userId: string
  sessionId: string
  loginFinishedFunctionId: string
  persistentLocalClientId: string
  requestId: string | null
  requestingUserId: string | null
  customCtx?: JsonObject
}

export interface RemovePersistentLocalClient {
  userId: string
  appId: string
}

export class ClusterHandler implements ClusterListener {
  private readonly log: Logger

  constructor(
    loggerFactory: LoggerFactory,
    private readonly worker: WorkerRoot,
    cluster: AppserverCluster,
    private readonly appManager: AppManager,
    private readonly responseSender: ResponseSender,
    private readonly userSender: UserSender,
    private readonly webServer: WebServer,
  ) {
    this.log = loggerFactory.createForClass(ClusterHandler)
    cluster.clusterListener = this
  }

  async onMessage(cmd: string, msg: JsonObject): Promise<void> {
    switch (cmd) {
      case CCMD_SHUTDOWN_WORKER:
        this.worker.shutdown()
        break

      case CCMD_SHUTDOWN_APP:
        {
          const shutdownApp = msg as AppMaintenance
          this.appManager.shutdownApp(shutdownApp.id, false)
        }
        break

      case CCMD_INVOKE_ENTITY_FUNC:
        this.handleEntityFunc(msg as InvokeEntityFunc)
        break

      case CCMD_SEND_RESPONSE:
        {
          const sendResponse = msg as SendResponse
          this.responseSender.send(sendResponse.rId, sendResponse.data, sendResponse.httpData)
        }
        break

      case CCMD_SEND_TO_USER:
        {
          const sendToUser = msg as SendToUser
          this.userSender.send(sendToUser.uId, sendToUser.data)
        }
        break

      case CCMD_LOGIN_PERSISTENT_LOCAL_CLIENT:
        {
          const loginPersistentLocalClient = msg as LoginPersistentLocalClient

          const client = this.webServer.getPersistentLocalClientById(loginPersistentLocalClient.persistentLocalClientId)
          if (!client) {
            this.log.log(LogLevel.WARN, `Unable to login persistent local client - it couldn't be found: ${loginPersistentLocalClient.persistentLocalClientId}`)
            return
          }

          const appResult = await this.appManager.getApp(loginPersistentLocalClient.appId)
          if (!appResult.app) {
            this.log.log(LogLevel.ERROR, `Unable to login persistent local client - unknown app: ${loginPersistentLocalClient.appId}`)
            return
          }

          appResult.app.userLogin.loginPersistentLocalClient(
            client,
            loginPersistentLocalClient.userId,
            loginPersistentLocalClient.sessionId,
            loginPersistentLocalClient.loginFinishedFunctionId,
            new FuncContextImpl(
              loginPersistentLocalClient.requestId,
              loginPersistentLocalClient.persistentLocalClientId,
              loginPersistentLocalClient.requestingUserId,
              this.responseSender,
            ),
            loginPersistentLocalClient.customCtx,
          )
        }
        break

      case CCMD_REMOVE_PERSISTENT_LOCAL_CLIENT:
        {
          const removePersistentLocalClient = msg as RemovePersistentLocalClient
          this.userSender.logoutLocal(removePersistentLocalClient.userId, removePersistentLocalClient.appId)
        }
        break

      default:
        this.log.log(LogLevel.ERROR, `Unknown cluster command: ${cmd}`)
        break
    }
  }

  private async handleEntityFunc(invokeEntityFunc: InvokeEntityFunc) {
    const appResult = await this.appManager.getApp(invokeEntityFunc.appId)
    if (!appResult.app) {
      this.log.log(LogLevel.ERROR, `AppId not found: ${invokeEntityFunc.appId}`)
      return
    }

    if (invokeEntityFunc.requestId) {
      this.responseSender.registerRemoteRequest(invokeEntityFunc.requestId, invokeEntityFunc.rs)
    }

    appResult.app.handleFunc(
      invokeEntityFunc.requestId,
      invokeEntityFunc.persistentLocalClientId,
      invokeEntityFunc.userId,
      invokeEntityFunc.func,
      invokeEntityFunc.entityType,
      invokeEntityFunc.entityId,
      invokeEntityFunc.payload,
    )
  }
}
