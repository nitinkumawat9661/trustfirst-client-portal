import argon2 from "argon2";
import { randomBytes, timingSafeEqual } from "crypto";
import { createHash } from "crypto";

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  memoryCost: 19456,
  parallelism: 1,
  timeCost: 3,
  type: argon2.argon2id,
};

export async function hashPassword(password: string) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function createSecureToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function safeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

