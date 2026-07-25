import { InvoiceStatus, PaymentMode, PaymentProvider, type PrismaClient } from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";
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

  it("creates invoices with temporary draft numbers", async () => {
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

    expect(created.invoiceNumber).toMatch(/^DRAFT-[0-9a-f-]{36}$/);
  });

  it("issues Mangalam invoices with an atomic final number", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T00:00:00.000Z"));

    try {
      const tx = {
        auditEvent: { create: async () => ({}) },
        billingTimelineEvent: { create: async () => ({}) },
        documentSequence: {
          upsert: async () => ({ lastValue: 1 }),
        },
        invoice: {
          update: async ({ data }: { data: Record<string, unknown> }) => ({
            ...invoice,
            ...data,
          }),
        },
      };

      const service = new BillingService(
        prismaMock({
          $transaction: async (callback: (client: typeof tx) => unknown) =>
            callback(tx),
          hardwareBusinessSettings: {
            findUnique: async () => ({
              invoicePrefix: "PENDING_CLIENT_CONFIRMATION",
            }),
          },
          invoice: {
            findFirst: async () => ({
              ...invoice,
              invoiceNumber: "DRAFT-order-1",
            }),
          },
          tenant: {
            findUnique: async () => ({
              slug: "manglam-trading-demo",
            }),
          },
        } as unknown as Partial<PrismaClient>),
      );

      const issued = await service.transitionInvoice(
        { tenantId: "tenant_1", userId: "user_1" },
        "inv_1",
        { status: InvoiceStatus.ISSUED },
      );

      expect(issued.invoiceNumber).toBe("MS/INV/2026-27/00001");
      expect(issued.status).toBe(InvoiceStatus.ISSUED);
    } finally {
      vi.useRealTimers();
    }
  });
  it("creates an automatic receipt for partial manual payments", async () => {
    const receivedAt = new Date("2026-07-25T10:30:00.000Z");

    const tx = {
      auditEvent: { create: async () => ({}) },
      billingTimelineEvent: { create: async () => ({}) },
      commercialDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: "receipt_1",
        }),
      },
      commercialDocumentTimelineEvent: {
        createMany: async () => ({ count: 2 }),
      },
      commercialDocumentVersion: {
        create: async () => ({}),
      },
      documentSequence: {
        upsert: async () => ({ lastValue: 1 }),
      },
      invoice: {
        findFirst: async () => ({
          branding: {},
          clientId: null,
          currency: "INR",
          invoiceNumber: "MS/INV/2026-27/00001",
          projectId: null,
          requirementId: null,
          title: "Portal invoice",
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          ...invoice,
          ...data,
          status: data.status,
        }),
      },
      paymentRecord: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: "pay_1",
        }),
      },
    };

    const service = new BillingService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => unknown) =>
          callback(tx),
        invoice: {
          findFirst: async () => ({
            ...invoice,
            invoiceNumber: "MS/INV/2026-27/00001",
            status: InvoiceStatus.ISSUED,
          }),
        },
        tenant: {
          findUnique: async () => ({
            slug: "manglam-trading-demo",
          }),
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
        receivedAt,
      },
    );

    expect(result.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.invoice.paidAmountCents).toBe(40_000);
    expect(result.receipt?.documentNumber).toBe(
      "MS/REC/2026-27/00001",
    );
    expect(result.payment.receiptDocumentId).toBe("receipt_1");
  });
  it("rejects invalid manual payment amounts", async () => {
    const service = new BillingService(
      prismaMock({
        invoice: {
          findFirst: async () => ({ ...invoice, status: InvoiceStatus.ISSUED }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(
      service.recordPayment(
        { tenantId: "tenant_1", userId: "user_1" },
        "inv_1",
        {
          amountCents: 0,
          mode: PaymentMode.CASH,
          provider: PaymentProvider.MANUAL,
        },
      ),
    ).rejects.toThrow("greater than zero");
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
