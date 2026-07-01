import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, verifyPassword } from "./passwords";

describe("password security", () => {
  it("hashes passwords with Argon2id and verifies them", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toContain("argon2id");
    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(
      true,
    );
    await expect(verifyPassword(hash, "incorrect password")).resolves.toBe(false);
  });

  it("hashes tokens deterministically without storing raw token values", () => {
    const token = "opaque-token";

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });
});

