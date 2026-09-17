import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret, hashPassword, verifyPassword, last4, maskKey } from "./crypto";

describe("crypto", () => {
  it("roundtrips secrets", () => {
    const enc = encryptSecret("sk-test-secret");
    expect(enc).not.toContain("sk-test-secret");
    expect(decryptSecret(enc)).toBe("sk-test-secret");
  });

  it("verifies passwords", () => {
    const stored = hashPassword("crew");
    expect(verifyPassword("crew", stored)).toBe(true);
    expect(verifyPassword("nope", stored)).toBe(false);
  });

  it("masks keys", () => {
    expect(last4("sk-1234abcd")).toBe("abcd");
    expect(maskKey("abcd")).toBe("•••• abcd");
  });
});
