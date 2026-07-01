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
});

