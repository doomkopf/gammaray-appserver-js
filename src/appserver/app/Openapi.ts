import { inject, Lifecycle, scoped } from "tsyringe"
import { GammarayApp, JsonObject } from "../api/core"

@scoped(Lifecycle.ContainerScoped)
export class Openapi {
  readonly json: JsonObject

  constructor(
    @inject("appId") appId: string,
    @inject("appRoot") appRoot: GammarayApp,
  ) {
    const paths: JsonObject = {}

    for (const key in appRoot.func) {
      const func = appRoot.func[key]
      const { rest } = func
      if (!rest) {
        continue
      }

      let path = ""
      for (const pathElem of rest.path) {
        path += pathElem.isVar ? `/{${pathElem.name}}` : `/${pathElem.name}`
      }

      path = `/api/${appId}${path}`
      let pathObj = paths[path]
      if (!pathObj) {
        pathObj = {}
        paths[path] = pathObj
      }

      let parameters
      if (rest.params) {
        parameters = []

        for (const param of rest.params) {
          parameters.push({
            name: param.name,
            in: param.in,
            description: param.description,
            required: param.required,
            schema: {
              type: "object",
              properties: param.schema,
            },
          })
        }
      }

      pathObj[rest.method.toLowerCase()] = {
        parameters,
        description: rest.description,
        responses: {},
      }
    }

    this.json = {
      swagger: "2.0",
      title: appId,
      consumes: [
        "application/json",
      ],
      produces: [
        "application/json",
      ],
      paths,
    }
  }
}
