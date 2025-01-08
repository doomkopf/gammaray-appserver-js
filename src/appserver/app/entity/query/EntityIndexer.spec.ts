import { anything, instance, mock, verify } from "ts-mockito"
import { ListFunctions } from "../../ListFunctions"
import { EntityIndexer } from "./EntityIndexer"
import { indexListKey, serializeEntityIdAndValue } from "./query"

test("beforeEntityFunc should not determine context when indexing disabled", () => {
  const subject = new EntityIndexer(instance(mock(ListFunctions)))

  const context = subject.beforeEntityFunc({}, { currentVersion: 0, func: mock() })

  expect(context).toBeUndefined()
})

test("beforeEntityFunc should not determine context when no entity", () => {
  const subject = new EntityIndexer(instance(mock(ListFunctions)))

  const context = subject.beforeEntityFunc(null as never, {
    index: { mode: "SIMPLE" },
    currentVersion: 0,
    func: mock(),
  })

  expect(context).toBeUndefined()
})

test("beforeEntityFunc should determine correct context for index mode SIMPLE", () => {
  const subject = new EntityIndexer(instance(mock(ListFunctions)))

  const context = subject.beforeEntityFunc({
    testNum: 123,
    testString: "hello",
    testBool: true,
    testObj: {},
    testArr: [],
  }, {
    index: { mode: "SIMPLE" },
    currentVersion: 0,
    func: mock(),
  })

  if (!context) {
    fail()
  }

  expect(context.oldAttributeValues["testNum"]).toBe(123)
  expect(context.oldAttributeValues["testString"]).toBe("hello")
  expect(context.oldAttributeValues["testBool"]).toBe(true)
  expect(context.oldAttributeValues["testObj"]).toBeUndefined()
  expect(context.oldAttributeValues["testArr"]).toBeUndefined()
})

test("indexEntity should index all changed top level fields and remove its old values if present and index mode SIMPLE", () => {
  const ENTITY_TYPE = "testEntity"
  const ENTITY_ID = "123"

  const listFunctions = mock(ListFunctions)

  const subject = new EntityIndexer(instance(listFunctions))

  subject.indexEntity(
    {
      propWithoutOldValue: "test",
      propWithOldValue: "testNew",
      propThatDidntChange: "sameValue",
    },
    {
      oldAttributeValues: {
        propWithOldValue: "testOld",
        propThatDidntChange: "sameValue",
      },
    },
    { mode: "SIMPLE" },
    ENTITY_TYPE,
    ENTITY_ID,
  )

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.add(
    indexListKey(ENTITY_TYPE, "propWithoutOldValue"),
    serializeEntityIdAndValue(ENTITY_ID, "test"),
  )).once()

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.remove(
    indexListKey(ENTITY_TYPE, "propWithoutOldValue"),
    anything(),
  )).never()

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.add(
    indexListKey(ENTITY_TYPE, "propWithOldValue"),
    serializeEntityIdAndValue(ENTITY_ID, "testNew"),
  )).once()

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.remove(
    indexListKey(ENTITY_TYPE, "propWithOldValue"),
    serializeEntityIdAndValue(ENTITY_ID, "testOld"),
  )).once()

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.add(
    indexListKey(ENTITY_TYPE, "propThatDidntChange"),
    anything(),
  )).never()

  // noinspection JSVoidFunctionReturnValueUsed
  verify(listFunctions.remove(
    indexListKey(ENTITY_TYPE, "propThatDidntChange"),
    anything(),
  )).never()
})
