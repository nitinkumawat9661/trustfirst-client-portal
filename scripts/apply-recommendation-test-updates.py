#!/usr/bin/env python3
from pathlib import Path

path = Path("apps/web/src/server/hardware/hardware-service.test.ts")
source = path.read_text(encoding="utf-8")
old = '''  it("rejects duplicate normalized customer mobile during quick-create", async () => {
    const service = new HardwareService(
      prismaMock({
        clientOrganization: {
          findMany: async () => [
            {
              contacts: [{ phone: "919876543210" }],
              customFields: { hardwarePartyRole: "customer" },
              name: "Existing Customer",
            },
          ],
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.quickCreateParty(
        { tenantId: "tenant_1", userId: "user_1" },
        { mobile: "09876543210", name: "New Customer", role: "customer" },
      ),
    ).rejects.toThrow("already exists");
  });'''
new = '''  it("selects an existing normalized customer mobile during quick-create", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const service = new HardwareService(
      prismaMock({
        clientContact: {
          create: async () => ({}),
          update: async () => ({}),
        },
        clientOrganization: {
          findMany: async () => [
            {
              contacts: [{ id: "contact_1", phone: "919876543210" }],
              customFields: {
                hardwarePartyRole: "customer",
                hardwarePartyRoles: ["customer"],
              },
              id: "customer_1",
              name: "Existing Customer",
            },
          ],
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updates.push(data);
            return { id: "customer_1", name: "Existing Customer" };
          },
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.quickCreateParty(
      { tenantId: "tenant_1", userId: "user_1" },
      { mobile: "09876543210", name: "New Customer", role: "customer" },
    );

    expect(result).toMatchObject({
      contact: "919876543210",
      id: "customer_1",
      name: "Existing Customer",
      role: "customer",
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      customFields: {
        hardwarePartyRole: "customer",
        hardwarePartyRoles: ["customer"],
      },
    });
  });'''
if new not in source:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one duplicate-party test block, found {count}.")
    source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8")
print("RECOMMENDATION_TEST_UPDATES_APPLIED")
