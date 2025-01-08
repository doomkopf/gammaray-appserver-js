import { hashMD5 } from "./crypto"

test("hashMD5 should always hash to the same result", () => {
  expect(hashMD5("hello"))
    .toBe("XUFAKrxLKna5cZ2REBfFkg==")

  expect(hashMD5("efc15dcb8dd65d44f717a96f02587a93"))
    .toBe("ZwnWmRFe7lBcoB33GzmMJw==")

  expect(hashMD5("CIohv1qA1R^6&!pUyO@i59VW1Y46C6&Zj9j0xZkKL5MKS9fHk0"))
    .toBe("T/YdEVW3sb7E65Xqv0KoqQ==")
})
