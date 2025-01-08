import { entityFullKey, hashStringToNumber, isEntityIdValid } from "./tools"

test("entityFullKey", () => {
  expect(entityFullKey("theAppId", "theEntityType", "theEntityId"))
    .toBe("theAppId_theEntityType_theEntityId")
})

test("hashStringToNumber should always hash to the same result", () => {
  const n1 = hashStringToNumberValidateSameResultAndReturnValue("hello")
  const n2 = hashStringToNumberValidateSameResultAndReturnValue("hallo")
  const n3 = hashStringToNumberValidateSameResultAndReturnValue("CIohv1qA1R^6&!pUyO@i59VW1Y46C6&Zj9j0xZkKL5MKS9fHk0")

  expect(n1).not.toBe(n2)
  expect(n2).not.toBe(n3)
  expect(n1).not.toBe(n3)
})

function hashStringToNumberValidateSameResultAndReturnValue(str: string): number {
  const v1 = hashStringToNumber(str)
  expect(v1).toBeGreaterThan(0)

  const v2 = hashStringToNumber(str)
  expect(v1).toBe(v2)

  return v1
}

const TOO_LONG_STRING = generateTooLongString()
const TOO_SHORT_STRING = "ab"

function generateTooLongString(): string {
  let str = ""
  for (let i = 0; i < 129; i++) {
    str += i
  }
  return str
}

test("should validate value", () => {
  expect(isEntityIdValid("entityId-1337_good")).toBeTruthy()
  expect(isEntityIdValid("")).toBeFalsy()
  expect(isEntityIdValid("aa")).toBeFalsy()
  expect(isEntityIdValid("///")).toBeFalsy()
  expect(isEntityIdValid("===")).toBeFalsy()
  expect(isEntityIdValid("___")).toBeTruthy()
  expect(isEntityIdValid("_=_")).toBeFalsy()
  expect(isEntityIdValid("   ")).toBeFalsy()
  expect(isEntityIdValid("test_user_RARdRS+AZYhZE083MPh8cw==")).toBeFalsy()
  expect(isEntityIdValid(TOO_LONG_STRING)).toBeFalsy()
  expect(isEntityIdValid(TOO_SHORT_STRING)).toBeFalsy()
})
