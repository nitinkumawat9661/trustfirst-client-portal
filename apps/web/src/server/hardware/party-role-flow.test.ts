import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareService } from "./hardware-service";

const context = { tenantId: "tenant_1", userId: "user_1" };

function membership() {
  return {
    role: {
      key: "admin",
      permissions: [{ permission: { key: "*" } }],
    },
    status: "ACTIVE",
  };
}

function party(customFields: Record<string, unknown>) {
  return {
    archivedAt: null,
    contacts: [],
    customFields,
    deletedAt: null,
    id: "party_1",
    invoices: [],
    name: "Dual Role Traders",
    supplierHardwareDocuments: [],
  };
}

describe("hardware customer and supplier roles", () => {
  it("selects the existing record and adds supplier role instead of creating a duplicate", async () => {
    const updates: Array<Record<string, unknown>> = [];
    let creates = 0;
    const existing = party({
      hardwareOpeningBalances: { customer: 1200 },
      hardwarePartyRole: "customer",
      hardwarePartyRoles: ["customer"],
      openingBalanceCents: 1200,
    });
    const service = new HardwareService({
      clientContact: {
        create: async () => ({}),
        update: async () => ({}),
      },
      clientOrganization: {
        create: async () => {
          creates += 1;
          return { id: "unexpected", name: "Unexpected" };
        },
        findMany: async () => [existing],
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return existing;
        },
      },
      tenantMembership: { findUnique: async () => membership() },
    } as unknown as PrismaClient);

    const result = await service.quickCreateParty(context, {
      name: "  dual   role traders ",
      role: "supplier",
    });

    expect(result).toMatchObject({ id: "party_1", name: "Dual Role Traders", role: "supplier" });
    expect(creates).toBe(0);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      customFields: {
        hardwareOpeningBalances: { customer: 1200, supplier: 0 },
        hardwarePartyRole: "customer",
        hardwarePartyRoles: ["customer", "supplier"],
      },
    });
  });

  it("returns the same organization in both lists with independent opening balances", async () => {
    const record = party({
      hardwareOpeningBalances: { customer: 2500, supplier: -900 },
      hardwarePartyRole: "customer",
      hardwarePartyRoles: ["customer", "supplier"],
      openingBalanceCents: 2500,
    });
    const service = new HardwareService({
      clientOrganization: { findMany: async () => [record] },
      tenantMembership: { findUnique: async () => membership() },
    } as unknown as PrismaClient);

    const [customers, suppliers] = await Promise.all([
      service.listParties(context, "customer"),
      service.listParties(context, "supplier"),
    ]);

    expect(customers).toHaveLength(1);
    expect(suppliers).toHaveLength(1);
    expect(customers[0]).toMatchObject({ id: "party_1", openingBalanceCents: 2500, role: "customer" });
    expect(suppliers[0]).toMatchObject({ id: "party_1", openingBalanceCents: -900, role: "supplier" });
  });
});
