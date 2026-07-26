import { hashPassword } from "../security/passwords";
import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { AuthenticationService } from "./auth-service";

describe("AuthenticationService", () => {
  it("rejects unknown credentials without leaking account existence", async () => {
    const prisma = {
      auditEvent: {
        create: async () => ({}),
      },
      loginHistory: {
        create: async () => ({}),
      },
      rateLimitEvent: {
        findUnique: async () => null,
        upsert: async () => ({}),
      },
      user: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;
    const service = new AuthenticationService(prisma);

    await expect(
      service.authorizeCredentials(
        {
          email: "missing@example.com",
          password: "password-123",
          rememberMe: false,
        },
        {
          correlationId: "corr_1",
          requestId: "req_1",
        },
      ),
    ).resolves.toEqual({
      code: "invalid_credentials",
      ok: false,
    });
  });

  it("verifies current password before changing it", async () => {
    const passwordHash = await hashPassword("CorrectPassword!2026");
    const prisma = {
      auditEvent: { create: async () => ({}) },
      user: {
        findUnique: async () => ({ id: "user_1", passwordHash }),
        update: async () => ({}),
      },
    } as unknown as PrismaClient;
    const service = new AuthenticationService(prisma);

    await expect(
      service.changePassword(
        "user_1",
        { currentPassword: "WrongPassword!2026", newPassword: "NewPassword!2026" },
        { correlationId: "corr_1", requestId: "req_1" },
      ),
    ).rejects.toThrow("Current password");
  });

  it("rejects unauthorized admin password resets", async () => {
    const prisma = {
      tenantMembership: {
        findUnique: async ({ where }: { where: { tenantId_userId: { userId: string } } }) =>
          where.tenantId_userId.userId === "actor_1"
            ? {
                role: { key: "viewer", permissions: [{ permission: { key: "hardware.sales.read" } }] },
                status: "ACTIVE",
              }
            : { userId: "target_1" },
      },
    } as unknown as PrismaClient;
    const service = new AuthenticationService(prisma);

    await expect(
      service.adminResetPassword(
        "actor_1",
        "tenant_1",
        { temporaryPassword: "Temporary!2026", userId: "target_1" },
        { correlationId: "corr_1", requestId: "req_1" },
      ),
    ).rejects.toThrow("not allowed");
  });
});
