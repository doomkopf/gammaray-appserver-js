import { deserializeEntityIdAndValue, serializeEntityIdAndValue } from "./query"

test("serializeEntityIdAndValue: should serialize", () => {
  expect(serializeEntityIdAndValue("entityId", "theValue")).toBe("entityId>!gam!<theValue")
})

test("deserializeEntityIdAndValue: should deserialize", () => {
  const idAndValue = deserializeEntityIdAndValue("entityId>!gam!<theValue")

  expect(idAndValue.id).toBe("entityId")
  expect(idAndValue.value).toBe("theValue")
})
