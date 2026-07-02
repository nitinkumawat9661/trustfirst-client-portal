import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { releaseReadinessChecklist } from "./release-readiness";

describe("releaseReadinessChecklist", () => {
  it("projects release readiness across env, db, auth, hardware, pwa, print, and offline queue", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalAuthSecret = process.env.AUTH_SECRET;
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/demo";
    process.env.AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";

    const prisma = {
      $queryRaw: async () => [{ "?column?": 1 }],
      $transaction: async () => [3, 1, 2],
      clientOrganization: { count: async () => 2 },
      hardwareBusinessSettings: { findUnique: async () => ({ id: "settings_1" }) },
      hardwareProduct: { count: async () => 3 },
      hardwareStockLocation: { count: async () => 1 },
    } as unknown as PrismaClient;

    const checklist = await releaseReadinessChecklist({
      activeUserId: "user_1",
      prisma,
      tenantId: "tenant_1",
    });

    expect(checklist.ready).toBe(true);
    expect(checklist.items.map((item) => item.key)).toEqual([
      "env",
      "database",
      "auth",
      "hardware-demo",
      "pwa",
      "print",
      "offline-queue",
    ]);

    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.AUTH_SECRET = originalAuthSecret;
  });
});
