import { describe, expect, it } from "vitest";
import {
  DocumentSequenceKind,
  FinancialAllocationType,
  FinancialTransactionType,
  PaymentProvider,
} from "@trustfirst/database";
import {
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
});
