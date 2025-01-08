import { instance, mock, verify, when } from "ts-mockito"
import { Database } from "../Database"
import { ChunkedWrapperDatabase } from "./ChunkedWrapperDatabase"

// to at least be able to store one character: sep + next-key + sep + one char
const EXPECTED_NEXT_KEY_SIZE = 7 + 64 + 7

test("instantiation should fail when maxValueSizePerDoc below minimum", async () => {
  expect(() => new ChunkedWrapperDatabase(instance(mock<Database>()), EXPECTED_NEXT_KEY_SIZE))
    .toThrow()
})

test("should split doc if maxValueSizePerDoc exceeded", async () => {
  const db = mock<Database>()

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 3)

  await wrapper.put("key", "123456789x")

  verify(db.put("key_2", "x")).once()
  verify(db.put("key_1", "|>gam<|key_2|>gam<|789")).once()
  verify(db.put("key_0", "|>gam<|key_1|>gam<|456")).once()
  verify(db.put("key", "|>gam<|key_0|>gam<|123")).once()
})

test("should be one value if limit not exceeded", async () => {
  const db = mock<Database>()

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  await wrapper.put("key", "a")

  verify(db.put("key", "a")).once()
})

test("should collect multiple values to one doc", async () => {
  const db = mock<Database>()

  when(db.get("key_1")).thenResolve("x")
  when(db.get("key_0")).thenResolve("|>gam<|key_1|>gam<|0")
  when(db.get("key")).thenResolve("|>gam<|key_0|>gam<|0123456789")

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  const doc = await wrapper.get("key")

  expect(doc).toBe("01234567890x")
})

test("should collect single value as the doc", async () => {
  const db = mock<Database>()

  when(db.get("key")).thenResolve("0123456789")

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  const doc = await wrapper.get("key")

  expect(doc).toBe("0123456789")
})

test("should remove multiple docs recursively", async () => {
  const db = mock<Database>()

  when(db.get("key_1")).thenResolve("678")
  when(db.get("key_0")).thenResolve("|>gam<|key_1|>gam<|345")
  when(db.get("key")).thenResolve("|>gam<|key_0|>gam<|012")

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  await wrapper.remove("key")

  verify(db.remove("key")).once()
  verify(db.remove("key_0")).once()
  verify(db.remove("key_1")).once()
})

test("should not end up in endless recursion on get", async () => {
  const db = mock<Database>()

  mockDocChainThatRefersToItself(db)

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  await expect(() => wrapper.get("key")).rejects.toThrow()
})

test("should not end up in endless recursion on remove", async () => {
  const db = mock<Database>()

  mockDocChainThatRefersToItself(db)

  const wrapper = new ChunkedWrapperDatabase(instance(db), EXPECTED_NEXT_KEY_SIZE + 1)

  await expect(() => wrapper.remove("key")).rejects.toThrow()
})

function mockDocChainThatRefersToItself(dbMock: Database) {
  when(dbMock.get("key_0")).thenResolve("|>gam<|key_0|>gam<|345")
  when(dbMock.get("key")).thenResolve("|>gam<|key_0|>gam<|012")
}
