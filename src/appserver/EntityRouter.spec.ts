import { anything, deepEqual, instance, mock, verify, when } from "ts-mockito"
import { ClusterLocalCache } from "../lib/cache/ClusterLocalCache"
import { ClusterLocalCacheFactory } from "../lib/cache/ClusterLocalCacheFactory"
import { entityFullKey } from "../lib/tools/tools"
import { mockLoggerFactory } from "../lib/unit-test-tools/test-tools"
import { AppserverCluster } from "./AppserverCluster"
import { CCMD_INVOKE_ENTITY_FUNC } from "./ClusterHandler"
import { EntityRouter } from "./EntityRouter"
import { ResponseSender } from "./ResponseSender"

const APP_ID = "appId"
const ENTITY_ID = "eId"

test("should delete entity mapping", async () => {
  const mockedClusterLocalCacheFactory = mock(ClusterLocalCacheFactory)
  const mockedClusterCache = mock(ClusterLocalCache)
  const mockedCluster = mock(AppserverCluster)
  const mockedResponseSender = mock(ResponseSender)

  when(mockedClusterLocalCacheFactory.create(anything())).thenReturn(instance(mockedClusterCache))

  const router = new EntityRouter(
    mockLoggerFactory(),
    "nodeId1",
    ["w1"],
    "w1",
    instance(mockedClusterLocalCacheFactory),
    instance(mockedCluster),
    instance(mockedResponseSender),
  )

  await router.releaseEntityMapping(APP_ID, "eType", ENTITY_ID)

  verify(mockedClusterCache.remove(entityFullKey(APP_ID, "eType", ENTITY_ID))).once()
})

test("should determine nodeId and be local because only one node", async () => {
  const mockedClusterLocalCacheFactory = mock(ClusterLocalCacheFactory)
  const mockedClusterCache = mock(ClusterLocalCache)
  const mockedCluster = mock(AppserverCluster)
  const mockedResponseSender = mock(ResponseSender)

  when(mockedClusterLocalCacheFactory.create(anything())).thenReturn(instance(mockedClusterCache))

  const router = new EntityRouter(
    mockLoggerFactory(),
    "nodeId1",
    ["w1"],
    "w1",
    instance(mockedClusterLocalCacheFactory),
    instance(mockedCluster),
    instance(mockedResponseSender),
  )

  when(mockedCluster.getAllNodeIds()).thenReturn(["nodeId1"])

  const result = await router.redirectOrLocal(APP_ID, "eType", "eFunc", ENTITY_ID, null, null, null, {})

  expect(result).toBeFalsy()

  verify(mockedClusterCache.putIfAbsent(entityFullKey(APP_ID, "eType", ENTITY_ID), "nodeId1")).once()
})

test("should send to remote", async () => {
  const mockedClusterLocalCacheFactory = mock(ClusterLocalCacheFactory)
  const mockedClusterCache = mock(ClusterLocalCache)
  const mockedCluster = mock(AppserverCluster)
  const mockedResponseSender = mock(ResponseSender)

  when(mockedClusterLocalCacheFactory.create(anything())).thenReturn(instance(mockedClusterCache))

  const router = new EntityRouter(
    mockLoggerFactory(),
    "nodeIdLocal",
    ["w1"],
    "w1",
    instance(mockedClusterLocalCacheFactory),
    instance(mockedCluster),
    instance(mockedResponseSender),
  )

  when(await mockedClusterCache.get(entityFullKey(APP_ID, "eType", ENTITY_ID))).thenReturn("nodeIdRemote")

  const result = await router.redirectOrLocal(APP_ID, "eType", "eFunc", ENTITY_ID, null, null, null, { test: 3 })

  expect(result).toBeTruthy()

  verify(mockedCluster.sendToNode("nodeIdRemote", null, CCMD_INVOKE_ENTITY_FUNC, deepEqual({
    appId: APP_ID,
    requestId: null,
    persistentLocalClientId: null,
    userId: null,
    func: "eFunc",
    entityType: "eType",
    entityId: "eId",
    payload: { test: 3 },
    rs: {
      nId: "nodeIdLocal",
      wId: "w1",
    },
  }))).once()
})

test("should use existing source worker for requestId and send to remote", async () => {
  const mockedClusterLocalCacheFactory = mock(ClusterLocalCacheFactory)
  const mockedClusterCache = mock(ClusterLocalCache)
  const mockedCluster = mock(AppserverCluster)
  const mockedResponseSender = mock(ResponseSender)

  when(mockedClusterLocalCacheFactory.create(anything())).thenReturn(instance(mockedClusterCache))

  const router = new EntityRouter(
    mockLoggerFactory(),
    "nodeIdLocal",
    ["w1"],
    "w1",
    instance(mockedClusterLocalCacheFactory),
    instance(mockedCluster),
    instance(mockedResponseSender),
  )

  when(await mockedClusterCache.get(entityFullKey(APP_ID, "eType", ENTITY_ID))).thenReturn("nodeIdRemote")
  when(mockedResponseSender.getSourceWorker("rId")).thenReturn({ nId: "someNodeId", wId: "someWorkerId" })

  const result = await router.redirectOrLocal(APP_ID, "eType", "eFunc", ENTITY_ID, "rId", null, null, { test: 3 })

  expect(result).toBeTruthy()

  verify(mockedCluster.sendToNode("nodeIdRemote", null, CCMD_INVOKE_ENTITY_FUNC, deepEqual({
    appId: APP_ID,
    requestId: "rId",
    persistentLocalClientId: null,
    userId: null,
    func: "eFunc",
    entityType: "eType",
    entityId: "eId",
    payload: { test: 3 },
    rs: {
      nId: "someNodeId",
      wId: "someWorkerId",
    },
  }))).once()
})
