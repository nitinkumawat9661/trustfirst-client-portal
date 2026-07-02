import {
  ClientLifecycleStage,
  ClientStatus,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { ClientService } from "./client-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "manager",
          permissions: [
            { permission: { key: "crm.read" } },
            { permission: { key: "crm.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("ClientService", () => {
  it("validates lifecycle transitions", async () => {
    const service = new ClientService(
      prismaMock({
        clientOrganization: {
          findFirst: async () => ({
            deletedAt: null,
            lifecycleStage: ClientLifecycleStage.CLIENT,
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.transitionStatus(
        { tenantId: "tenant_1", userId: "user_1" },
        "client_1",
        {
          lifecycleStage: ClientLifecycleStage.LEAD,
          status: ClientStatus.NEW,
        },
      ),
    ).rejects.toThrow("cannot transition");
  });

  it("builds CSV import previews with row validation", () => {
    const service = new ClientService(prismaMock());
    const preview = service.previewCsvImport(
      "name,website\nTrustFirst,https://trustfirst.example\nBroken,not-a-url",
    );

    expect(preview.validRows).toBe(1);
    expect(preview.invalidRows).toBe(1);
    expect(preview.rows[1]?.issues).toContain("Website must be a valid URL.");
  });

  it("plans client export contracts", () => {
    const service = new ClientService(prismaMock());

    expect(
      service.planExport({ clientId: "client_1", format: "pdf", scope: "client" }),
    ).toMatchObject({
      contentType: "application/pdf",
      fileName: "client-client_1.pdf",
      format: "pdf",
    });
  });
});

