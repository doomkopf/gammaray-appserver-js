import { anything, instance, mock, verify, when } from "ts-mockito"
import { BigObjectRepository } from "../BigObjectRepository"
import { BigObjects } from "./BigObjects"

const APP_ID = "appId"

test("should load all objects from objects list", async () => {
  const repo = mock(BigObjectRepository)
  when(await repo.getObjectsList(APP_ID)).thenReturn({ ids: ["first", "second"] })
  when(await repo.getObject(APP_ID, "first")).thenReturn({ test1: "ok" })
  when(await repo.getObject(APP_ID, "second")).thenReturn({ test2: "ok as well" })

  const subject = new BigObjects(APP_ID, instance(repo))

  await subject.init()

  verify(repo.getObjectsList(anything())).once()
  verify(repo.getObject(anything(), anything())).twice()

  const obj1 = subject.getObject("first")
  const obj2 = subject.getObject("second")

  if (!obj1 || !obj2) {
    fail()
  }

  expect(obj1.test1).toBe("ok")
  expect(obj2.test2).toBe("ok as well")
})
