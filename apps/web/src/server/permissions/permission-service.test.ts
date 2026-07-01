import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { PermissionResolverService } from "./permission-service";

describe("PermissionResolverService", () => {
  it("resolves role permissions and enforces matching policy", async () => {
    const prisma = {
      tenantMembership: {
        findUnique: async () => ({
          role: {
            key: "owner",
            permissions: [
              {
                permission: {
                  key: "tenant.manage",
                },
              },
            ],
          },
          status: "ACTIVE",
        }),
      },
    } as unknown as PrismaClient;
    const service = new PermissionResolverService(prisma);

    const result = await service.enforce({
      policy: { allOf: ["tenant.manage"] },
      tenantId: "tenant_1",
      userId: "user_1",
    });

    expect(result.roleKey).toBe("owner");
    expect(result.permissions).toEqual(["tenant.manage"]);
  });

  it("rejects resource ownership mismatches", () => {
    const service = new PermissionResolverService({} as PrismaClient);

    expect(() =>
      service.validateOwnership({
        resourceTenantId: "tenant_2",
        tenantId: "tenant_1",
        userId: "user_1",
      }),
    ).toThrow("another tenant");
  });
});

