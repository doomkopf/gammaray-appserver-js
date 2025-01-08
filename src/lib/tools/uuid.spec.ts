import { isUuid, nameBasedUuid } from "./uuid"

test("isUuid", () => {
  expect(isUuid("15327b38-270f-451a-8880-c240fbaf1452")).toBeTruthy()
  expect(isUuid("hello")).toBeFalsy()
})

test("nameBasedUuid", () => {
  expect(nameBasedUuid("test123")).toBe("7288edd0-fc3f-5cbe-93a0-cf06e3568e28")
  expect(nameBasedUuid("CIohv1qA1R^6&!pUyO@i59VW1Y46C6&Zj9j0xZkKL5MKS9fHk0")).toBe("30ee8499-7bc0-5994-a9a3-59c2ae97bbf9")
})
