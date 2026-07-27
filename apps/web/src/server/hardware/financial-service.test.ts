import {
  FinancialPartyType,
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMode,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it } from "vitest";
import { HardwareFinancialService } from "./financial-service";

function prismaMock(overrides: Partial<PrismaClient> = {}) {
  return {
    tenantMembership: {
      findUnique: async () => ({
        role: {
          key: "hardware-financial-viewer",
          permissions: [
            { permission: { key: "hardware.sales.read" } },
            { permission: { key: "hardware.sales.manage" } },
          ],
        },
        status: "ACTIVE",
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("HardwareFinancialService", () => {
  it("posts manual ledger adjustments as immutable financial transactions", async () => {
    const createdTransactions: Array<Record<string, unknown>> = [];
    const auditEvents: Array<Record<string, unknown>> = [];
    const tx = {
      auditEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { auditEvents.push(data); return data; } },
      documentSequence: { upsert: async () => ({ lastValue: 1 }) },
      financialTransaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdTransactions.push(data);
          return { id: "fin_adjustment_1", ...data };
        },
        findUnique: async () => null,
      },
    };
    const service = new HardwareFinancialService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
        clientOrganization: {
          findFirst: async () => ({
            archivedAt: null,
            customFields: { hardwarePartyRole: "customer" },
            deletedAt: null,
            id: "party_1",
            name: "Sample Customer",
            tenantId: "tenant_1",
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    const adjustment = await service.recordAdjustment(
      { tenantId: "tenant_1", userId: "user_1" },
      {
        amountCents: 2500,
        direction: "credit",
        idempotencyKey: "manual-adjustment-test",
        partyId: "party_1",
        reason: "Post-sale approved discount",
        reference: "OWNER-APPROVED",
        role: "customer",
      },
    );

    expect(adjustment.transactionNumber).toBe("MS/CADJ/2026-27/00001");
    expect(createdTransactions).toEqual([
      expect.objectContaining({
        amountCents: 2500,
        creditCents: 2500,
        debitCents: 0,
        idempotencyKey: "manual-adjustment-test",
        partyId: "party_1",
        type: FinancialTransactionType.MANUAL_CREDIT_ADJUSTMENT,
      }),
    ]);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toEqual(expect.objectContaining({
      action: "BILLING_PAYMENT_RECORDED",
      metadata: expect.objectContaining({ auditAction: "hardware.financial.adjustment.posted" }),
    }));
  });

  it("builds a read-only receipt print projection from a saved payment transaction", async () => {
    const service = new HardwareFinancialService(
      prismaMock({
        financialTransaction: {
          findFirst: async () => ({
            allocationsFrom: [
              {
                amountCents: 7500,
                hardwareDocument: { documentNumber: "HSO-2026-0001" },
                invoice: { invoiceNumber: "MS/INV/2026-27/00001" },
                toTransaction: { sourceNumber: "HSO-2026-0001", transactionNumber: "MS/AR/2026-27/00001" },
              },
            ],
            amountCents: 7500,
            externalReference: "UPI123",
            id: "fin_1",
            notes: "Received at counter",
            occurredAt: new Date("2026-07-27T06:00:00.000Z"),
            party: {
              contacts: [{ phone: "9999999999" }],
              customFields: { address: "Main Market", gstin: "08ABCDE1234F1Z5" },
              name: "Sample Customer",
            },
            partyType: FinancialPartyType.CUSTOMER,
            paymentMode: PaymentMode.UPI,
            sourceNumber: "HSO-2026-0001",
            status: FinancialTransactionStatus.POSTED,
            transactionNumber: "MS/REC/2026-27/00001",
            type: FinancialTransactionType.CUSTOMER_PAYMENT,
          }),
        },
        hardwareBusinessSettings: {
          findUnique: async () => ({
            address: { city: "Jaipur", line1: "Shop 1" },
            email: "billing@example.com",
            firmName: "MANGALAM SANITARY",
            gstin: "08EFPK7672A1ZT",
            logoPlaceholder: null,
            phone: "9000000000",
            termsFooter: "Payment once posted follows configured reversal controls.",
          }),
        },
        tenant: {
          findUnique: async () => ({
            branding: {
              logo: { assetKey: "client-assets/mangalam/branding/logo.jpeg" },
              officialIdentity: { legalName: "KRISHAN KUMAR", proprietorName: "KRISHAN KUMAR", status: "LOCKED" },
              tagline: "BATHWARE • PLUMBING • HARDWARE",
            },
          }),
        },
      } as unknown as Partial<PrismaClient>),
    );

    const projection = await service.transactionPrintProjection({ tenantId: "tenant_1", userId: "user_1" }, "fin_1");

    expect(projection.firm.firmName).toBe("MANGALAM SANITARY");
    expect(projection.firm.logoUrl).toBe("/api/tenants/branding/logo");
    expect(projection.party?.name).toBe("Sample Customer");
    expect(projection.transaction.transactionNumber).toBe("MS/REC/2026-27/00001");
    expect(projection.allocations).toEqual([
      {
        amountCents: 7500,
        documentNumber: "HSO-2026-0001",
        invoiceNumber: "MS/INV/2026-27/00001",
        targetNumber: "MS/AR/2026-27/00001",
      },
    ]);
    expect(projection.amountInWords).toContain("Seventy Five rupees");
  });

  it("corrects a manual adjustment by reversing the original and posting a linked replacement", async () => {
    const createdTransactions: Array<Record<string, unknown>> = [];
    const updatedTransactions: Array<Record<string, unknown>> = [];
    const original = {
      amountCents: 5000,
      creditCents: 0,
      debitCents: 5000,
      externalReference: "OPENING-CORRECTION",
      hardwareDocumentId: null,
      id: "fin_original",
      invoiceId: null,
      partyId: "party_1",
      partyType: FinancialPartyType.CUSTOMER,
      sourceNumber: "OPENING-CORRECTION",
      status: FinancialTransactionStatus.POSTED,
      transactionNumber: "MS/CADJ/2026-27/00001",
      type: FinancialTransactionType.MANUAL_DEBIT_ADJUSTMENT,
    };
    const tx = {
      auditEvent: { create: async ({ data }: { data: Record<string, unknown> }) => data },
      documentSequence: { upsert: async () => ({ lastValue: createdTransactions.length + 1 }) },
      financialTransaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const created = { id: `fin_created_${createdTransactions.length + 1}`, ...data };
          createdTransactions.push(created);
          return created;
        },
        findUnique: async () => null,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedTransactions.push(data);
          return { ...original, ...data };
        },
      },
    };
    const service = new HardwareFinancialService(
      prismaMock({
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
        financialTransaction: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) => "metadata" in where ? null : original,
        },
      } as unknown as Partial<PrismaClient>),
    );

    const result = await service.correctAdjustment(
      { tenantId: "tenant_1", userId: "user_1" },
      "fin_original",
      {
        amountCents: 7500,
        confirm: true,
        direction: "credit",
        idempotencyKey: "adjustment-correction-test",
        reason: "Owner approved correction",
        reference: "CORRECTED",
      },
    );

    expect(updatedTransactions[0]).toEqual(expect.objectContaining({ status: "REVERSED" }));
    expect(createdTransactions).toEqual([
      expect.objectContaining({
        creditCents: 5000,
        debitCents: 0,
        idempotencyKey: "adjustment-correction-test:reversal",
        reversalOfId: "fin_original",
      }),
      expect.objectContaining({
        creditCents: 7500,
        debitCents: 0,
        idempotencyKey: "adjustment-correction-test:replacement",
        metadata: expect.objectContaining({
          originalTransactionId: "fin_original",
          replacementOfTransactionId: "fin_original",
          reversalTransactionId: result.reversal.id,
        }),
      }),
    ]);
  });

  it("rejects duplicate manual adjustment correction attempts", async () => {
    const original = {
      amountCents: 5000,
      creditCents: 0,
      debitCents: 5000,
      externalReference: null,
      hardwareDocumentId: null,
      id: "fin_original",
      invoiceId: null,
      partyId: "party_1",
      partyType: FinancialPartyType.CUSTOMER,
      sourceNumber: null,
      status: FinancialTransactionStatus.POSTED,
      transactionNumber: "MS/CADJ/2026-27/00001",
      type: FinancialTransactionType.MANUAL_DEBIT_ADJUSTMENT,
    };
    const service = new HardwareFinancialService(
      prismaMock({
        financialTransaction: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) => "metadata" in where ? { id: "fin_replacement" } : original,
        },
      } as unknown as Partial<PrismaClient>),
    );

    await expect(service.correctAdjustment(
      { tenantId: "tenant_1", userId: "user_1" },
      "fin_original",
      {
        amountCents: 7500,
        confirm: true,
        direction: "credit",
        idempotencyKey: "adjustment-correction-test",
        reason: "Owner approved correction",
      },
    )).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
