import { instance, mock, verify } from "ts-mockito"
import { Cache, CacheListener } from "./Cache"

test("should put and get entry", () => {
  const cache = new Cache<string>(1, 1)

  expect(cache.getAt("key", 1))
    .toBe(null)

  cache.putAt("key", "v", 1)

  expect(cache.get("key"))
    .toBe("v")
})

test("should drop oldest entry when full", () => {
  const cache = new Cache<string>(1, 2)
  cache.putAt("key2", "v2", 2)
  cache.putAt("key1", "v1", 1)
  cache.putAt("key3", "v3", 3)

  expect(cache.size)
    .toBe(2)

  expect(cache.getAt("key1", 4))
    .toBe(null)
  expect(cache.getAt("key2", 4))
    .toBe("v2")
  expect(cache.getAt("key3", 4))
    .toBe("v3")
})

test("should invalidate outdated keys", () => {
  const listener = mock<CacheListener<string>>()

  const evictionTime = 10
  const cache = new Cache<string>(evictionTime, 4, instance(listener))
  cache.putAt("key1", "v1", 1)
  cache.putAt("key2", "v2", 3)
  cache.putAt("key3", "v3", 2)
  cache.putAt("keyPutBeforeButGetLater", "v4", 1)

  cache.getAt("keyPutBeforeButGetLater", 3)

  const future = evictionTime + 3
  cache.cleanupAt(future)

  expect(cache.size)
    .toBe(2)

  expect(cache.getAt("key1", future))
    .toBe(null)
  expect(cache.getAt("key2", future))
    .toBe("v2")
  expect(cache.getAt("key3", future))
    .toBe(null)
  expect(cache.getAt("keyPutBeforeButGetLater", future))
    .toBe("v4")

  verify(listener.onEntryEvicted("key1", "v1")).once()
  verify(listener.onEntryEvicted("key3", "v3")).once()
})

test("should be empty after clear", () => {
  const cache = new Cache<string>(1, 2)
  cache.putAt("key1", "v1", 1)
  cache.putAt("key2", "v2", 1)

  cache.clear()

  expect(cache.size)
    .toBe(0)

  expect(cache.getAt("key1", 1))
    .toBe(null)
  expect(cache.getAt("key2", 1))
    .toBe(null)
})
