import { inject, Lifecycle, scoped } from "tsyringe"
import { GammarayApp } from "../api/core"
import { HttpMethod } from "../api/http"
import { HttpPathElement } from "../api/rest"

@scoped(Lifecycle.ContainerScoped)
export class RestMapping {
  private readonly map = new Map<HttpMethod, { func: string, path: HttpPathElement[] }[]>()

  constructor(
    @inject("appRoot") appRoot: GammarayApp,
  ) {
    for (const funcName in appRoot.func) {
      const func = appRoot.func[funcName]
      const { rest } = func
      if (rest) {
        let elems = this.map.get(rest.method)
        if (!elems) {
          elems = []
          this.map.set(rest.method, elems)
        }

        elems.push({
          func: funcName,
          path: rest.path,
        })
      }
    }
  }

  determineFuncAndPathParams(method: HttpMethod, path: string): {
    func: string;
    params: Map<string, string>;
  } | null {
    const funcs = this.map.get(method)
    if (!funcs) {
      return null
    }

    for (const func of funcs) {
      const params = this.pathMatchesFunctionPath(path, func.path)
      if (params) {
        return {
          func: func.func,
          params,
        }
      }
    }

    return null
  }

  private pathMatchesFunctionPath(path: string, funcPath: HttpPathElement[]): Map<string, string> | null {
    const splitPath = path.split("/")
    splitPath.shift()
    if (splitPath.length !== funcPath.length) {
      return null
    }

    for (let i = 0; i < splitPath.length; i++) {
      const pathElem = splitPath[i]
      const funcPathElem = funcPath[i]
      if (!funcPathElem.isVar && pathElem !== funcPathElem.name) {
        return null
      }
    }

    const params = new Map<string, string>()

    for (let i = 0; i < splitPath.length; i++) {
      const pathElem = splitPath[i]
      const funcPathElem = funcPath[i]
      if (funcPathElem.isVar) {
        params.set(funcPathElem.name, pathElem)
      }
    }

    return params
  }
}
