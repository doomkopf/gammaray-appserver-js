import { anyString, anything, deepEqual, instance, mock, verify, when } from "ts-mockito"
import { Cache } from "../../../lib/cache/Cache"
import { Database } from "../../../lib/db/Database"
import { Scheduler } from "../../../lib/schedule/Scheduler"
import { entityFullKey, sleep } from "../../../lib/tools/tools"
import { SyncExecutor } from "../../../lib/unit-test-tools/SyncExecutor"
import { mockLoggerFactory } from "../../../lib/unit-test-tools/test-tools"
import { FuncContext, FuncVisibility, JsonObject } from "../../api/core"
import { Lib } from "../../api/lib"
import { Config } from "../../Config"
import { EntityRouter } from "../../EntityRouter"
import { ResponseSender } from "../../ResponseSender"
import { EntitiesContainer } from "./EntitiesContainer"
import { EntitiesContainers } from "./EntitiesContainers"
import { EntityContainer } from "./EntityContainer"
import { EntityFunctions } from "./EntityFunctions"
import { EntityMigrator } from "./EntityMigrator"
import { EntityIndexer } from "./query/EntityIndexer"

const APP_ID = "123"
const ENTITY_ID = "eId"

test("should not execute locally if entity not local", async () => {
  const mockedConfig = mock(Config)
  const mockedDatabase = mock<Database>()
  const mockedEntityRouter = mock(EntityRouter)
  const mockedResponseSender = mock(ResponseSender)
  const scheduler = mock<Scheduler>()
  const executor = new SyncExecutor()

  when(await mockedEntityRouter.redirectOrLocal(anything(), anything(), anything(), anything(), null, null, null, null))
    .thenReturn(true)

  const mockedEntityCache = mock(Cache)

  const mockedEntityTypeContainers = mockEntityTypeContainersWithHeroEntity(
    instance(mockedEntityCache),
    () => {
      //
    },
  )

  const subject = new EntityFunctions(
    mockLoggerFactory(),
    instance(mockedConfig),
    APP_ID,
    instance(mockedEntityTypeContainers),
    instance(mockedDatabase),
    instance(mockedEntityRouter),
    instance(mock(EntityIndexer)),
    instance(mockedResponseSender),
    scheduler,
    executor,
  )

  await subject.invoke("eType", "eFunc", ENTITY_ID, null)

  verify(mockedEntityTypeContainers.get(anyString())).never()
})

const expectedEntity = { health: 30, _iv: 1 }

test("should load existing entity, create entity container, call func and mark entity dirty", async () => {
  const mockedConfig = mock(Config)
  const mockedDatabase = mock<Database>()
  const mockedEntityRouter = mock(EntityRouter)
  const mockedResponseSender = mock(ResponseSender)
  const scheduler = mock(Scheduler)
  const executor = new SyncExecutor()

  when(mockedConfig.getNumber("entityEvictionTimeMillis")).thenReturn(1)
  when(mockedConfig.getNumber("entityCacheMaxEntries")).thenReturn(1)
  when(mockedConfig.getNumber("entityCacheCleanupDelayMillis")).thenReturn(1)

  const mockedEntityFunc = jest.fn()
  mockedEntityFunc.mockReturnValue(expectedEntity)

  const mockedEntityCache = mock(Cache)
  const mockedEntityMigrator = mock(EntityMigrator)

  when(mockedEntityMigrator.migrateEntityIfNecessary(anything())).thenReturn(expectedEntity)

  const mockedEntityTypeContainers = mockEntityTypeContainersWithHeroEntity(
    instance(mockedEntityCache),
    mockedEntityFunc,
  )

  when(await mockedDatabase.get(entityFullKey(APP_ID, "hero", ENTITY_ID))).thenReturn(JSON.stringify(expectedEntity))

  const subject = new EntityFunctions(
    mockLoggerFactory(),
    instance(mockedConfig),
    APP_ID,
    instance(mockedEntityTypeContainers),
    instance(mockedDatabase),
    instance(mockedEntityRouter),
    instance(mock(EntityIndexer)),
    instance(mockedResponseSender),
    scheduler,
    executor,
  )

  subject.invoke("hero", "eFunc", ENTITY_ID, { test: 1234 })

  await sleep(10)

  verify(await mockedDatabase.get(entityFullKey(APP_ID, "hero", ENTITY_ID))).once()
  // Bug in ts-mockito: At the time of calling the method the field dirty is actually false, but it seems to just keep a ref to the object and doesn't take into account that the state might be changed later
  verify(mockedEntityCache.put(ENTITY_ID, deepEqual({ e: expectedEntity, type: "hero", dirty: true }))).once()
  expect(mockedEntityFunc).toBeCalledTimes(1)
  expect(mockedEntityFunc.mock.calls[0][0]).toStrictEqual(expectedEntity)
  expect(mockedEntityFunc.mock.calls[0][1]).toBe(ENTITY_ID)
  expect(mockedEntityFunc.mock.calls[0][3]).toStrictEqual({ test: 1234 })
})

function mockEntityTypeContainersWithHeroEntity(
  entityCache: Cache<EntityContainer>,
  entityFunc: (entity: JsonObject, id: string, lib: Lib, payload: JsonObject, ctx: FuncContext) => void,
): EntitiesContainers {
  const mockedEntityTypeContainers = mock(EntitiesContainers)

  const entityTypeContainer: EntitiesContainer<JsonObject> = mock(EntitiesContainer)
  when(entityTypeContainer.entityType).thenReturn({
    currentVersion: 1,
    func: {
      eFunc: {
        func: entityFunc,
        vis: FuncVisibility.pri,
      },
    },
  })
  when(entityTypeContainer.entities).thenReturn(entityCache)

  const migrator = mock(EntityMigrator)
  when(migrator.migrateEntityIfNecessary(anything())).thenReturn(expectedEntity)

  when(entityTypeContainer.migrator).thenReturn(instance(migrator))

  const entityTypeContainerInstance = instance(entityTypeContainer) as unknown as EntitiesContainer<never>

  when(mockedEntityTypeContainers.iterable()).thenReturn([["hero", entityTypeContainerInstance]])
  when(mockedEntityTypeContainers.get("hero")).thenReturn(entityTypeContainerInstance)

  return mockedEntityTypeContainers
}
