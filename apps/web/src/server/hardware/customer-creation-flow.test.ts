import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareService } from "./hardware-service";
import { quickHardwarePartySchema } from "./schemas";

const context = { tenantId: "tenant_1", userId: "user_1" };

function membership(permission: string) {
  return {
    role: {
      key: "hardware-manager",
      permissions: [{ permission: { key: permission } }],
    },
    status: "ACTIVE",
  };
}

describe("Fast Bill customer creation", () => {
  it("accepts a name-only customer payload", () => {
    expect(
      quickHardwarePartySchema.parse({
        name: "Walk In Retail Customer",
        role: "customer",
      }),
    ).toEqual({ name: "Walk In Retail Customer", role: "customer" });
  });

  it("persists and returns a name-only customer without requiring mobile or GSTIN", async () => {
    const createdRows: Array<Record<string, unknown>> = [];
    let contactCreates = 0;
    const service = new HardwareService({
      clientContact: {
        create: async () => {
          contactCreates += 1;
          return {};
        },
      },
      clientOrganization: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdRows.push(data);
          return { id: "customer_1", name: data.name as string };
        },
        findMany: async () => [],
        findUnique: async () => null,
      },
      tenantMembership: {
        findUnique: async () => membership("hardware.sales.manage"),
      },
    } as unknown as PrismaClient);

    const result = await service.quickCreateParty(context, {
      name: "Walk In Retail Customer",
      role: "customer",
    });

    expect(result).toMatchObject({
      id: "customer_1",
      name: "Walk In Retail Customer",
      role: "customer",
    });
    expect(createdRows).toHaveLength(1);
    expect(createdRows[0]).toMatchObject({
      customFields: {
        hardwarePartyRole: "customer",
        openingBalanceCents: 0,
      },
      name: "Walk In Retail Customer",
      tenantId: "tenant_1",
    });
    expect(contactCreates).toBe(0);
  });

  it("opens the customer dialog and retains the created customer in Fast Bill state", () => {
    const sourcePath = fileURLToPath(
      new URL("../../components/hardware/quick-pos-form.tsx", import.meta.url),
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("setQuickCustomer(name);");
    expect(source).toContain("setCustomerName(party.name);");
    expect(source).toContain(
      "current.filter((customer) => customer.id !== party.id)",
    );
  });
});
