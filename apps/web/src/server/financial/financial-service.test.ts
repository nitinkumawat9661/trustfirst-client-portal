import { describe, expect, it } from "vitest";
import {
  DocumentSequenceKind,
  FinancialAllocationType,
  FinancialPartyType,
  FinancialTransactionType,
  PaymentProvider,
} from "@trustfirst/database";
import {
  postCustomerPaymentWithAllocations,
  postFinancialReversal,
  postCustomerPayment,
  postSaleCancellationFinancials,
  postSaleReceivable,
} from "./financial-service";

function txMock() {
  const transactions: Array<Record<string, unknown>> = [];
  const allocations: Array<Record<string, unknown>> = [];
  let sequence = 0;

  return {
    allocations,
    transactions,
    tx: {
      documentSequence: {
        upsert: async ({ create }: { create: { kind: DocumentSequenceKind } }) => {
          sequence += 1;
          return { lastValue: sequence, kind: create.kind };
        },
      },
      financialAllocation: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          allocations.push(data);
          return { id: `alloc_${allocations.length}`, ...data };
        },
      },
      financialTransaction: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const transaction = { id: `fin_${transactions.length + 1}`, ...data };
          transactions.push(transaction);
          return transaction;
        },
        findUnique: async ({ where }: { where: { tenantId_idempotencyKey: { idempotencyKey: string } } }) =>
          transactions.find((transaction) => transaction.idempotencyKey === where.tenantId_idempotencyKey.idempotencyKey) ?? null,
        update: async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
          const transaction = transactions.find((candidate) => candidate.id === where.id);
          Object.assign(transaction ?? {}, data);
          return transaction;
        },
      },
    },
  };
}

describe("financial service", () => {
  it("posts idempotent sale receivables with debit direction", async () => {
    const mock = txMock();
    const input = {
      amountCents: 12500,
      createdById: "user_1",
      hardwareDocumentId: "doc_1",
      idempotencyKey: "sale-1:receivable",
      invoiceId: "inv_1",
      partyId: "customer_1",
      sourceId: "doc_1",
      sourceNumber: "HSO-2026-0001",
      sourceType: "HardwareTradeDocument",
      tenantId: "tenant_1",
    };

    const first = await postSaleReceivable(mock.tx as never, input);
    const second = await postSaleReceivable(mock.tx as never, input);

    expect(first).toBe(second);
    expect(mock.transactions).toHaveLength(1);
    expect(mock.transactions[0]).toMatchObject({
      amount: "125.00",
      creditCents: 0,
      debitCents: 12500,
      type: FinancialTransactionType.SALE_RECEIVABLE,
    });
  });

  it("posts customer payment and invoice allocation atomically", async () => {
    const mock = txMock();

    const payment = await postCustomerPayment(mock.tx as never, {
      allocationTargetTransactionId: "fin_sale",
      amountCents: 5000,
      createdById: "user_1",
      hardwareDocumentId: "doc_1",
      idempotencyKey: "payment-1",
      invoiceId: "inv_1",
      mode: "UPI",
      partyId: "customer_1",
      provider: PaymentProvider.MANUAL,
      sourceId: "pay_1",
      sourceNumber: "MS/INV/2026-27/00001",
      sourceType: "PaymentRecord",
      tenantId: "tenant_1",
    });

    expect(payment).toMatchObject({
      creditCents: 5000,
      debitCents: 0,
      paymentMode: "UPI",
      type: FinancialTransactionType.CUSTOMER_PAYMENT,
    });
    expect(mock.allocations[0]).toMatchObject({
      amount: "50.00",
      amountCents: 5000,
      fromTransactionId: "fin_1",
      toTransactionId: "fin_sale",
      type: FinancialAllocationType.INVOICE_PAYMENT,
    });
  });

  it("posts one idempotent customer receipt across multiple invoices", async () => {
    const mock = txMock();
    const input = {
      allocations: [
        { amountCents: 3000, hardwareDocumentId: "doc_1", invoiceId: "inv_1", targetTransactionId: "fin_sale_1" },
        { amountCents: 2000, hardwareDocumentId: "doc_2", invoiceId: "inv_2", targetTransactionId: "fin_sale_2" },
      ],
      amountCents: 5000,
      createdById: "user_1",
      idempotencyKey: "multi-payment-1",
      mode: "BANK_TRANSFER" as const,
      partyId: "customer_1",
      provider: PaymentProvider.MANUAL,
      sourceId: "customer_1",
      sourceType: "ClientOrganization",
      tenantId: "tenant_1",
    };

    const payment = await postCustomerPaymentWithAllocations(mock.tx as never, input);
    const retry = await postCustomerPaymentWithAllocations(mock.tx as never, input);

    expect(retry).toBe(payment);
    expect(payment).toMatchObject({
      amountCents: 5000,
      paymentMode: "BANK_TRANSFER",
      type: FinancialTransactionType.CUSTOMER_PAYMENT,
    });
    expect(mock.transactions).toHaveLength(1);
    expect(mock.allocations).toEqual([
      expect.objectContaining({ amountCents: 3000, toTransactionId: "fin_sale_1", type: FinancialAllocationType.INVOICE_PAYMENT }),
      expect.objectContaining({ amountCents: 2000, toTransactionId: "fin_sale_2", type: FinancialAllocationType.INVOICE_PAYMENT }),
    ]);
  });

  it("rejects mismatched multi-invoice allocation totals", async () => {
    const mock = txMock();

    await expect(postCustomerPaymentWithAllocations(mock.tx as never, {
      allocations: [{ amountCents: 3000, targetTransactionId: "fin_sale_1" }],
      amountCents: 5000,
      createdById: "user_1",
      idempotencyKey: "bad-payment-1",
      mode: "CASH",
      partyId: "customer_1",
      sourceId: "customer_1",
      sourceType: "ClientOrganization",
      tenantId: "tenant_1",
    })).rejects.toThrow("Payment allocation total must equal payment amount.");
  });

  it("splits cancellation into receivable reversal and refund-pending liability", async () => {
    const mock = txMock();

    await postSaleCancellationFinancials(mock.tx as never, {
      amountCents: 12000,
      createdById: "user_1",
      hardwareDocumentId: "doc_1",
      idempotencyKey: "cancel-1",
      invoiceId: "inv_1",
      paidAmountCents: 7000,
      partyId: "customer_1",
      reason: "Customer cancelled",
      sourceId: "doc_1",
      sourceNumber: "HSO-2026-0001",
      sourceType: "HardwareTradeDocument",
      tenantId: "tenant_1",
      totalAmountCents: 12000,
    });

    expect(mock.transactions).toEqual([
      expect.objectContaining({
        amountCents: 5000,
        type: FinancialTransactionType.SALE_CANCELLATION_REVERSAL,
      }),
      expect.objectContaining({
        amountCents: 7000,
        type: FinancialTransactionType.CUSTOMER_REFUND_PENDING,
      }),
    ]);
  });

  it("marks the original payment reversed and posts an opposite-direction reversal", async () => {
    const mock = txMock();
    await postFinancialReversal(mock.tx as never, {
      amountCents: 7000,
      createdById: "user_1",
      idempotencyKey: "reverse-payment-1",
      original: {
        creditCents: 7000,
        debitCents: 0,
        id: "fin_original",
        partyType: FinancialPartyType.CUSTOMER,
        transactionNumber: "MS/REC/2026-27/00001",
        type: FinancialTransactionType.CUSTOMER_PAYMENT,
      },
      partyId: "customer_1",
      reason: "Wrong customer selected",
      sourceId: "fin_original",
      sourceNumber: "MS/REC/2026-27/00001",
      sourceType: "FinancialTransaction",
      tenantId: "tenant_1",
    });

    expect(mock.transactions[0]).toMatchObject({
      creditCents: 0,
      debitCents: 7000,
      type: FinancialTransactionType.PAYMENT_REVERSAL,
    });
  });
});
