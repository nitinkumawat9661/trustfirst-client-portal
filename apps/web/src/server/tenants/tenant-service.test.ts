import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { TenantApplicationService } from "./tenant-service";

describe("TenantApplicationService", () => {
  it("resolves active tenant context from memberships", async () => {
    const prisma = {
      tenantMembership: {
        findMany: async () => [
          {
            id: "membership_1",
            role: { id: "role_1", key: "owner" },
            status: "ACTIVE",
            tenant: {
              branding: {},
              id: "tenant_1",
              name: "TrustFirst",
              primaryDomain: null,
              settings: {},
              slug: "trustfirst",
              status: "ACTIVE",
            },
            tenantId: "tenant_1",
            userId: "user_1",
          },
        ],
      },
    } as unknown as PrismaClient;
    const service = new TenantApplicationService(prisma);

    await expect(service.resolveForUser("user_1")).resolves.toMatchObject({
      activeTenant: {
        id: "tenant_1",
      },
      memberships: [
        {
          roleKey: "owner",
        },
      ],
    });
  });
});

