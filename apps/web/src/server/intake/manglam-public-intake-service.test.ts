import { RequirementStatus, type PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { manglamPublicIntakeDefaults } from "../../features/intake/manglam-intake-schema";
import {
  MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
  ManglamPublicIntakeService,
  PUBLIC_INTAKE_SOURCE,
} from "./manglam-public-intake-service";

function validInput() {
  return {
    ...manglamPublicIntakeDefaults,
    business: {
      ...manglamPublicIntakeDefaults.business,
      address: "Sample market road, demo city",
    },
    catalog: {
      ...manglamPublicIntakeDefaults.catalog,
      productCategories: ["Pipes"],
      unitTypes: ["Piece"],
    },
    company: {
      ...manglamPublicIntakeDefaults.company,
      contactName: "Demo Owner",
      firmName: "Demo Hardware Store",
      phone: "9999999999",
    },
    notes: {
      ...manglamPublicIntakeDefaults.notes,
      painPoints: "Manual billing and stock tracking take too much time.",
      successCriteria: "The demo should prove quotation, sale, stock, print, and payment flow.",
    },
    payments: {
      ...manglamPublicIntakeDefaults.payments,
      paymentModes: ["Cash"],
    },
    reports: {
      ...manglamPublicIntakeDefaults.reports,
      requiredReports: ["Daily sales"],
    },
  };
}

describe("ManglamPublicIntakeService", () => {
  it("stores public intake as a tenant-scoped submitted requirement", async () => {
    const createdRequirements: Array<Record<string, unknown>> = [];
    const timelineEvents: Array<Record<string, unknown>> = [];
    const service = new ManglamPublicIntakeService({
      $transaction: async (
        callback: (tx: {
          requirement: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
          requirementTimelineEvent: { create: (input: { data: Record<string, unknown> }) => Promise<unknown> };
          requirementVersion: { create: (input: { data: Record<string, unknown> }) => Promise<unknown> };
        }) => Promise<unknown>,
      ) =>
        callback({
          requirement: {
            create: async ({ data }) => {
              createdRequirements.push(data);
              return { id: "req_1", ...data };
            },
          },
          requirementTimelineEvent: {
            create: async ({ data }) => {
              timelineEvents.push(data);
              return {};
            },
          },
          requirementVersion: { create: async () => ({}) },
        }),
      clientOrganization: {
        upsert: async ({ create, where }: { create: { slug: string; tenantId: string }; where: { tenantId_slug: { slug: string } } }) => {
          expect(where.tenantId_slug.slug).toBe(MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG);
          return { id: "client_1", ...create };
        },
      },
      requirement: {
        count: async () => 0,
        findMany: async () => [],
      },
      tenant: {
        findUnique: async () => ({ id: "tenant_1" }),
      },
    } as unknown as PrismaClient);

    const result = await service.submit(validInput(), {
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result).toMatchObject({
      businessName: "Demo Hardware Store",
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      possibleDuplicate: false,
      status: RequirementStatus.PENDING,
      submissionNumber: `PUB-REQ-${new Date().getFullYear()}-0001`,
    });
    expect(result.submittedAt).toBeInstanceOf(Date);
    expect(createdRequirements[0]).toMatchObject({
      clientId: "client_1",
      priority: "HIGH",
      status: RequirementStatus.PENDING,
      tenantId: "tenant_1",
      title: "Public intake - Demo Hardware Store",
    });
    expect(createdRequirements[0]?.metadata).toMatchObject({
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      publicIntake: true,
      possibleDuplicate: false,
      reviewed: false,
      source: PUBLIC_INTAKE_SOURCE,
      statusLabel: "New Requirement Submitted",
    });
    expect(timelineEvents[0]?.metadata).toMatchObject({
      clientSlug: MANGLAM_PUBLIC_INTAKE_CLIENT_SLUG,
      receiptLog: true,
      source: PUBLIC_INTAKE_SOURCE,
      status: RequirementStatus.PENDING,
    });
  });

  it("marks obvious recent duplicate submissions without blocking a receipt", async () => {
    const service = new ManglamPublicIntakeService({
      $transaction: async (
        callback: (tx: {
          requirement: { create: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
          requirementTimelineEvent: { create: () => Promise<unknown> };
          requirementVersion: { create: () => Promise<unknown> };
        }) => Promise<unknown>,
      ) =>
        callback({
          requirement: { create: async ({ data }) => ({ id: "req_2", ...data }) },
          requirementTimelineEvent: { create: async () => ({}) },
          requirementVersion: { create: async () => ({}) },
        }),
      clientOrganization: {
        upsert: async () => ({ id: "client_1" }),
      },
      requirement: {
        count: async () => 1,
        findMany: async () => [
          {
            metadata: { submissionNumber: "PUB-REQ-2026-0001" },
            submittedData: validInput(),
          },
        ],
      },
      tenant: {
        findUnique: async () => ({ id: "tenant_1" }),
      },
    } as unknown as PrismaClient);

    await expect(service.submit(validInput())).resolves.toMatchObject({
      possibleDuplicate: true,
      submissionNumber: `PUB-REQ-${new Date().getFullYear()}-0002`,
    });
  });

  it("marks public intake submissions as reviewed without exposing them publicly", async () => {
    const service = new ManglamPublicIntakeService({
      $transaction: async (
        callback: (tx: {
          requirement: { update: (input: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
          requirementTimelineEvent: { create: (input: { data: Record<string, unknown> }) => Promise<unknown> };
        }) => Promise<unknown>,
      ) =>
        callback({
          requirement: { update: async ({ data }) => ({ id: "req_1", ...data }) },
          requirementTimelineEvent: { create: async () => ({}) },
        }),
      requirement: {
        findFirst: async () => ({ metadata: { source: PUBLIC_INTAKE_SOURCE } }),
      },
    } as unknown as PrismaClient);

    await expect(service.markReviewed("tenant_1", "req_1", "user_1")).resolves.toMatchObject({
      metadata: expect.objectContaining({ reviewed: true, reviewedById: "user_1" }),
    });
  });
});
