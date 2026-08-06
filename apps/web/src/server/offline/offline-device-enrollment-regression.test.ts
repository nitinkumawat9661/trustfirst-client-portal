import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const numberLeaseSource = readFileSync(
  new URL("./number-lease-service.ts", import.meta.url),
  "utf8",
);

// Protect the production PostgreSQL offline-device enrollment path from the Prisma void-deserialization regression.
describe("offline device enrollment PostgreSQL regression", () => {
  it("projects the transaction advisory lock to a Prisma-safe integer", () => {
    expect(numberLeaseSource).toContain('SELECT 1::int AS "locked"');
    expect(numberLeaseSource).toContain("FROM pg_advisory_xact_lock");
    expect(numberLeaseSource).not.toContain("SELECT pg_advisory_xact_lock(");
  });
});
