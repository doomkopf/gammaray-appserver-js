import { anyString, deepEqual, instance, mock, verify, when } from "ts-mockito"
import { EntityFunctions } from "../api/core"
import { Lib } from "../api/lib"
import { LIST_FUNCTIONS_MAX_ELEMENTS_PER_CHUNK, LISTS_ENTITY_TYPE } from "../constants"
import { DEAD_FUNC_CTX } from "./app-constants"
import { AddListElem, ListChunk, listFuncAdd } from "./ListFunctions"

const LIST_ID = "x"

test("add should create entity with elem if it doesn't exist yet", () => {
  const lib = mock<Lib>()

  const params: AddListElem = {
    e: "theElem",
  }

  const result = listFuncAdd.func(
    null as unknown as ListChunk,
    LIST_ID,
    instance(lib),
    params,
    DEAD_FUNC_CTX,
  )

  const listChunk = result as ListChunk

  expect(listChunk.next).toBeNull()
  expect(listChunk.list).toHaveLength(1)
  expect(listChunk.list[0]).toBe("theElem")
})

function createStringArrayWithSize(size: number, elem: string): string[] {
  const arr: string[] = []

  for (let i = 0; i < size; i++) {
    arr.push(elem)
  }

  return arr
}

test("add should invoke addNext (when limit exceeded) with current list chunk and make current chunk to point to the newly generated one", () => {
  const lib = mock<Lib>()
  const entityFunctions = mock<EntityFunctions>()

  when(lib.entityFunc).thenReturn(instance(entityFunctions))

  const listChunk: ListChunk = {
    list: createStringArrayWithSize(LIST_FUNCTIONS_MAX_ELEMENTS_PER_CHUNK, "x"),
    next: null,
  }

  const params: AddListElem = {
    e: "theElem",
  }

  listFuncAdd.func(
    listChunk,
    LIST_ID,
    instance(lib),
    params,
    DEAD_FUNC_CTX,
  )

  const expectedParams = {
    list: createStringArrayWithSize(LIST_FUNCTIONS_MAX_ELEMENTS_PER_CHUNK, "x"),
    next: null,
  }
  verify(entityFunctions.invoke(
    LISTS_ENTITY_TYPE,
    "addNext",
    anyString(),
    deepEqual(expectedParams),
    DEAD_FUNC_CTX,
  )).once()
})
