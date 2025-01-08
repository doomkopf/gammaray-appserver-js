import { FuncContext } from "../api/core"

export const DEAD_FUNC_CTX: FuncContext = {
  requestId: null,
  persistentLocalClientId: null,
  requestingUserId: null,
  sendResponse() {
    // nothing
  },
}
