import * as cluster from "cluster"
import { masterWorkerInit } from "./master/master-worker"
import { workerInit } from "./worker/worker"

if (cluster.isMaster) {
  masterWorkerInit()
}
else {
  workerInit()
}
