import { FuncContext, StatelessFunc } from "./api/core"

export interface AdminTools {
  deployApp(appId: string, script: string, pw: string, finFunc: string, ctx: FuncContext): void
}

export interface DeployAppResult {
  success: boolean
}

export type DeployAppResultFunc = StatelessFunc<DeployAppResult>
