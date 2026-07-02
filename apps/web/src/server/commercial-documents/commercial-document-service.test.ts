import {
  CommercialDocumentStatus,
  CommercialDocumentType,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { commercialDocumentCreateSchema } from "./schemas";
import { CommercialDocumentService } from "./commercial-document-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  const base = {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "document-manager",
          permissions: [
            { permission: { key: "documents.read" } },
            { permission: { key: "documents.manage" } },
            { permission: { key: "documents.approve" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  };

  return base as unknown as PrismaClient;
}

const document = {
  archivedAt: null,
  attachments: [],
  branding: {},
  clientId: null,
  comments: [],
  content: {},
  currentVersion: 1,
  documentNumber: "QUO-2026-0001",
  id: "doc_1",
  metadata: {},
  projectId: null,
  requirementId: null,
  status: CommercialDocumentStatus.APPROVED,
  summary: null,
  templateKey: "standard",
  timeline: [],
  title: "Approved quotation",
  type: CommercialDocumentType.QUOTATION,
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  versions: [],
};

describe("CommercialDocumentService", () => {
  it("keeps invoice support in schema but blocks invoice creation in v1 validation", () => {
    expect(CommercialDocumentType.INVOICE).toBe("INVOICE");
    expect(() =>
      commercialDocumentCreateSchema.parse({
        templateKey: "standard",
        title: "Invoice draft",
        type: CommercialDocumentType.INVOICE,
      }),
    ).toThrow();
  });

  it("rejects invalid approval transitions", async () => {
    const service = new CommercialDocumentService(
      prismaMock({
        commercialDocument: {
          findFirst: async () => document,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.reject(
        { tenantId: "tenant_1", userId: "user_1" },
        "doc_1",
        { reason: "Not acceptable" },
      ),
    ).rejects.toThrow("cannot transition");
  });

  it("generates tenant-scoped document numbers", async () => {
    const tx = {
      commercialDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: "doc_1",
          status: CommercialDocumentStatus.DRAFT,
          updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
      },
      commercialDocumentTimelineEvent: { create: async () => ({}) },
      commercialDocumentVersion: { create: async () => ({}) },
    };
    const service = new CommercialDocumentService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
        clientOrganization: { findFirst: async () => null },
        commercialDocument: {
          count: async () => 2,
          findFirst: async () => null,
        },
        project: { findFirst: async () => null },
        requirement: { findFirst: async () => null },
      } as unknown as Partial<PrismaClient>),
    );

    const created = await service.create(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        templateKey: "standard",
        title: "New quotation",
        type: CommercialDocumentType.QUOTATION,
      },
    );

    expect(created.documentNumber).toMatch(/^QUO-\d{4}-0003$/);
  });

  it("blocks users without document permissions", async () => {
    const service = new CommercialDocumentService(
      prismaMock({
        tenantMembership: {
          findUnique: async () => ({
            role: { key: "viewer", permissions: [{ permission: { key: "crm.read" } }] },
            status: "ACTIVE",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.list({ tenantId: "tenant_1", userId: "user_1" }),
    ).rejects.toThrow("permission");
  });
});
