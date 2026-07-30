import type { PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareTradeService } from "./trade-service";

type PartyValidator = {
  ensureParty: (
    tenantId: string,
    id: string,
    role: "customer" | "supplier",
    message: string,
  ) => Promise<void>;
};

describe("trade party role validation", () => {
  it("accepts supplier role from the dual-role array while retaining legacy customer role", async () => {
    const service = new HardwareTradeService({
      clientOrganization: {
        findFirst: async () => ({
          customFields: {
            hardwarePartyRole: "customer",
            hardwarePartyRoles: ["customer", "supplier"],
          },
        }),
      },
    } as unknown as PrismaClient);

    await expect(
      (service as unknown as PartyValidator).ensureParty(
        "tenant_1",
        "party_1",
        "supplier",
        "Supplier was not valid.",
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps legacy single-role records compatible and rejects unrelated roles", async () => {
    const service = new HardwareTradeService({
      clientOrganization: {
        findFirst: async () => ({ customFields: { hardwarePartyRole: "customer" } }),
      },
    } as unknown as PrismaClient);
    const validator = service as unknown as PartyValidator;

    await expect(
      validator.ensureParty("tenant_1", "party_1", "customer", "Customer was not valid."),
    ).resolves.toBeUndefined();
    await expect(
      validator.ensureParty("tenant_1", "party_1", "supplier", "Supplier was not valid."),
    ).rejects.toThrow("Supplier was not valid.");
  });
});
