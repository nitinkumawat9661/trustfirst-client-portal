import { RequirementStatus, type PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { RequirementService } from "./requirement-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "requirements-manager",
          permissions: [
            { permission: { key: "requirements.read" } },
            { permission: { key: "requirements.manage" } },
            { permission: { key: "requirements.review" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const requirement = {
  archivedAt: null,
  attachments: [],
  clientId: null,
  comments: [],
  currentVersion: 1,
  drafts: [],
  dueAt: null,
  formSchema: { sections: [], version: 1 },
  id: "req_1",
  priority: "MEDIUM",
  reviewerId: "reviewer_1",
  status: RequirementStatus.APPROVED,
  timeline: [],
  title: "Approved requirement",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  versions: [],
};

describe("RequirementService", () => {
  it("rejects invalid approval transitions", async () => {
    const service = new RequirementService(
      prismaMock({
        requirement: {
          findFirst: async () => requirement,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.transitionApproval(
        { tenantId: "tenant_1", userId: "user_1" },
        "req_1",
        { status: "REJECTED" },
      ),
    ).rejects.toThrow("cannot transition");
  });

  it("compares requirement versions", async () => {
    const service = new RequirementService(
      prismaMock({
        requirement: {
          findFirst: async () => ({ ...requirement, status: RequirementStatus.UNDER_REVIEW }),
        },
        requirementVersion: {
          findFirst: async ({ where }: { where: { version: number } }) =>
            where.version === 1
              ? { data: { a: 1, b: 2 }, version: 1 }
              : { data: { a: 1, c: 3 }, version: 2 },
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.compareVersions({ tenantId: "tenant_1", userId: "user_1" }, "req_1", 1, 2),
    ).resolves.toEqual({
      added: ["c"],
      changed: [],
      fromVersion: 1,
      removed: ["b"],
      toVersion: 2,
    });
  });

  it("blocks access without requirement permissions", async () => {
    const service = new RequirementService(
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
      service.dashboard({ tenantId: "tenant_1", userId: "user_1" }),
    ).rejects.toThrow("permission");
  });
});

