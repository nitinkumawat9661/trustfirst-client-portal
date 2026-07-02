import { InvoiceStatus, PaymentMode, PaymentProvider, type PrismaClient } from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { BillingService, currentStatus, outstandingAmount } from "./billing-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "billing-manager",
          permissions: [
            { permission: { key: "billing.read" } },
            { permission: { key: "billing.manage" } },
            { permission: { key: "billing.payments.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

const invoice = {
  archivedAt: null,
  attachments: [],
  branding: {},
  clientId: null,
  comments: [],
  currency: "INR",
  dueAt: null,
  id: "inv_1",
  invoiceNumber: "INV-2026-0001",
  lineItems: [],
  paidAmountCents: 0,
  payments: [],
  status: InvoiceStatus.DRAFT,
  timeline: [],
  title: "Portal invoice",
  totalAmountCents: 100_000,
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("BillingService", () => {
  it("calculates outstanding and overdue invoice state", () => {
    expect(outstandingAmount({ paidAmountCents: 40_000, totalAmountCents: 100_000 })).toBe(60_000);
    expect(
      currentStatus({
        dueAt: new Date("2026-01-01T00:00:00.000Z"),
        status: InvoiceStatus.ISSUED,
      }),
    ).toBe(InvoiceStatus.OVERDUE);
  });

  it("generates invoice numbers", async () => {
    const tx = {
      auditEvent: { create: async () => ({}) },
      billingTimelineEvent: { create: async () => ({}) },
      invoice: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: "inv_1",
          paidAmountCents: 0,
          status: InvoiceStatus.DRAFT,
          updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
      },
    };
    const service = new BillingService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
        invoice: {
          count: async () => 4,
          findFirst: async () => null,
        },
      } as unknown as Partial<PrismaClient>),
    );

    const created = await service.createInvoice(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        lineItems: [{ description: "Discovery", quantity: 1, totalAmountCents: 50_000, unitAmountCents: 50_000 }],
        title: "Discovery invoice",
      },
    );

    expect(created.invoiceNumber).toMatch(/^INV-\d{4}-0005$/);
  });

  it("supports partial manual payment records", async () => {
    const tx = {
      auditEvent: { create: async () => ({}) },
      billingTimelineEvent: { create: async () => ({}) },
      invoice: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          ...invoice,
          ...data,
          status: data.status,
        }),
      },
      paymentRecord: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({ ...data, id: "pay_1" }),
      },
    };
    const service = new BillingService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
        invoice: {
          findFirst: async () => ({ ...invoice, status: InvoiceStatus.ISSUED }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.recordPayment(
      { tenantId: "tenant_1", userId: "user_1" },
      "inv_1",
      {
        amountCents: 40_000,
        mode: PaymentMode.BANK_TRANSFER,
        provider: PaymentProvider.MANUAL,
      },
    );

    expect(result.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.invoice.paidAmountCents).toBe(40_000);
  });

  it("blocks users without billing permissions", async () => {
    const service = new BillingService(
      prismaMock({
        tenantMembership: {
          findUnique: async () => ({
            role: { key: "viewer", permissions: [{ permission: { key: "crm.read" } }] },
            status: "ACTIVE",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(service.listInvoices({ tenantId: "tenant_1", userId: "user_1" })).rejects.toThrow("permission");
  });
});
