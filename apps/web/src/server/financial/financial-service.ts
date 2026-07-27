import {
  DocumentSequenceKind,
  FinancialAllocationType,
  FinancialPartyType,
  FinancialTransactionType,
  PaymentProvider,
  type PaymentMode,
  type Prisma,
} from "@trustfirst/database";
import { allocateDocumentNumber } from "../billing/document-sequence";

type FinancialTransactionClient = Prisma.TransactionClient;

type BasePostingInput = {
  amountCents: number;
  createdById: string;
  externalReference?: string | null;
  hardwareDocumentId?: string | null;
  idempotencyKey: string;
  invoiceId?: string | null;
  notes?: string | null;
  occurredAt?: Date;
  partyId?: string | null;
  sourceNumber?: string | null;
  sourceType: string;
  sourceId: string;
  tenantId: string;
};

type CustomerPaymentInput = BasePostingInput & {
  allocationTargetTransactionId?: string | null;
  mode: PaymentMode;
  provider?: PaymentProvider;
};

type FinancialAllocationInput = {
  amountCents: number;
  hardwareDocumentId?: string | null;
  invoiceId?: string | null;
  targetTransactionId: string;
};

type MultiAllocationPaymentInput = BasePostingInput & {
  allocations: FinancialAllocationInput[];
  mode: PaymentMode;
  provider?: PaymentProvider;
};

export async function postSaleReceivable(
  tx: FinancialTransactionClient,
  input: BasePostingInput,
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: 0,
    debitCents: input.amountCents,
    documentKind: DocumentSequenceKind.ADJUSTMENT,
    partyType: FinancialPartyType.CUSTOMER,
    prefix: "MS/AR",
    type: FinancialTransactionType.SALE_RECEIVABLE,
  });
}

export async function postCustomerPayment(
  tx: FinancialTransactionClient,
  input: CustomerPaymentInput,
) {
  const payment = await postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: DocumentSequenceKind.RECEIPT,
    partyType: FinancialPartyType.CUSTOMER,
    paymentMode: input.mode,
    prefix: "MS/REC",
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: input.allocationTargetTransactionId
      ? FinancialTransactionType.CUSTOMER_PAYMENT
      : FinancialTransactionType.CUSTOMER_ADVANCE,
  });

  if (input.allocationTargetTransactionId) {
    await tx.financialAllocation.create({
      data: {
        amount: centsToDecimal(input.amountCents),
        amountCents: input.amountCents,
        fromTransactionId: payment.id,
        hardwareDocumentId: input.hardwareDocumentId ?? null,
        invoiceId: input.invoiceId ?? null,
        metadata: { idempotencyKey: `${input.idempotencyKey}:allocation` },
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        tenantId: input.tenantId,
        toTransactionId: input.allocationTargetTransactionId,
        type: FinancialAllocationType.INVOICE_PAYMENT,
      },
    });
  }

  return payment;
}

export async function postCustomerPaymentWithAllocations(
  tx: FinancialTransactionClient,
  input: MultiAllocationPaymentInput,
) {
  return postPaymentWithAllocations(tx, {
    ...input,
    allocationType: FinancialAllocationType.INVOICE_PAYMENT,
    documentKind: DocumentSequenceKind.RECEIPT,
    partyType: FinancialPartyType.CUSTOMER,
    prefix: "MS/REC",
    type: FinancialTransactionType.CUSTOMER_PAYMENT,
  });
}

export async function postCustomerAdvance(
  tx: FinancialTransactionClient,
  input: CustomerPaymentInput,
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: DocumentSequenceKind.RECEIPT,
    partyType: FinancialPartyType.CUSTOMER,
    paymentMode: input.mode,
    prefix: "MS/REC",
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: FinancialTransactionType.CUSTOMER_ADVANCE,
  });
}

export async function postSaleCancellationFinancials(
  tx: FinancialTransactionClient,
  input: BasePostingInput & {
    paidAmountCents: number;
    reason: string;
    totalAmountCents: number;
  },
) {
  const outstandingCents = Math.max(input.totalAmountCents - input.paidAmountCents, 0);
  const postings = [];

  if (outstandingCents > 0) {
    postings.push(await postFinancialTransaction(tx, {
      ...input,
      amountCents: outstandingCents,
      creditCents: outstandingCents,
      debitCents: 0,
      documentKind: DocumentSequenceKind.ADJUSTMENT,
      idempotencyKey: `${input.idempotencyKey}:receivable-reversal`,
      partyType: FinancialPartyType.CUSTOMER,
      prefix: "MS/CAN",
      type: FinancialTransactionType.SALE_CANCELLATION_REVERSAL,
    }));
  }

  if (input.paidAmountCents > 0) {
    postings.push(await postFinancialTransaction(tx, {
      ...input,
      amountCents: input.paidAmountCents,
      creditCents: input.paidAmountCents,
      debitCents: 0,
      documentKind: DocumentSequenceKind.REFUND,
      idempotencyKey: `${input.idempotencyKey}:refund-pending`,
      metadata: { reason: input.reason, refundStatus: "pending" },
      partyType: FinancialPartyType.CUSTOMER,
      prefix: "MS/RFD",
      type: FinancialTransactionType.CUSTOMER_REFUND_PENDING,
    }));
  }

  return postings;
}

export async function postSaleReturnCredit(
  tx: FinancialTransactionClient,
  input: BasePostingInput & {
    refundType: string;
  },
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: DocumentSequenceKind.ADJUSTMENT,
    metadata: { refundType: input.refundType },
    partyType: FinancialPartyType.CUSTOMER,
    prefix: "MS/RET",
    type: FinancialTransactionType.SALE_RETURN_CREDIT,
  });
}

export async function postPurchasePayable(
  tx: FinancialTransactionClient,
  input: BasePostingInput,
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: 0,
    debitCents: input.amountCents,
    documentKind: DocumentSequenceKind.ADJUSTMENT,
    partyType: FinancialPartyType.SUPPLIER,
    prefix: "MS/AP",
    type: FinancialTransactionType.PURCHASE_PAYABLE,
  });
}

export async function postSupplierPayment(
  tx: FinancialTransactionClient,
  input: CustomerPaymentInput,
) {
  const payment = await postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: DocumentSequenceKind.PAYMENT_VOUCHER,
    partyType: FinancialPartyType.SUPPLIER,
    paymentMode: input.mode,
    prefix: "MS/PV",
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: input.allocationTargetTransactionId
      ? FinancialTransactionType.SUPPLIER_PAYMENT
      : FinancialTransactionType.SUPPLIER_ADVANCE,
  });

  if (input.allocationTargetTransactionId) {
    await tx.financialAllocation.create({
      data: {
        amount: centsToDecimal(input.amountCents),
        amountCents: input.amountCents,
        fromTransactionId: payment.id,
        hardwareDocumentId: input.hardwareDocumentId ?? null,
        invoiceId: input.invoiceId ?? null,
        metadata: { idempotencyKey: `${input.idempotencyKey}:allocation` },
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        tenantId: input.tenantId,
        toTransactionId: input.allocationTargetTransactionId,
        type: FinancialAllocationType.SUPPLIER_BILL_PAYMENT,
      },
    });
  }

  return payment;
}

export async function postSupplierPaymentWithAllocations(
  tx: FinancialTransactionClient,
  input: MultiAllocationPaymentInput,
) {
  return postPaymentWithAllocations(tx, {
    ...input,
    allocationType: FinancialAllocationType.SUPPLIER_BILL_PAYMENT,
    documentKind: DocumentSequenceKind.PAYMENT_VOUCHER,
    partyType: FinancialPartyType.SUPPLIER,
    prefix: "MS/PV",
    type: FinancialTransactionType.SUPPLIER_PAYMENT,
  });
}

export async function postSupplierAdvance(
  tx: FinancialTransactionClient,
  input: CustomerPaymentInput,
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: DocumentSequenceKind.PAYMENT_VOUCHER,
    partyType: FinancialPartyType.SUPPLIER,
    paymentMode: input.mode,
    prefix: "MS/PV",
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: FinancialTransactionType.SUPPLIER_ADVANCE,
  });
}

export async function postCustomerRefundPaid(
  tx: FinancialTransactionClient,
  input: CustomerPaymentInput,
) {
  return postFinancialTransaction(tx, {
    ...input,
    creditCents: 0,
    debitCents: input.amountCents,
    documentKind: DocumentSequenceKind.REFUND,
    partyType: FinancialPartyType.CUSTOMER,
    paymentMode: input.mode,
    prefix: "MS/RFD",
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: FinancialTransactionType.CUSTOMER_REFUND_PAID,
  });
}

export async function postFinancialReversal(
  tx: FinancialTransactionClient,
  input: BasePostingInput & {
    original: {
      creditCents: number;
      debitCents: number;
      id: string;
      partyType: FinancialPartyType;
      transactionNumber: string;
      type: FinancialTransactionType;
    };
    reason: string;
  },
) {
  await tx.financialTransaction.update({
    data: {
      reversalReason: input.reason,
      reversedAt: input.occurredAt ?? new Date(),
      reversedById: input.createdById,
      status: "REVERSED",
    },
    where: { id: input.original.id },
  });

  const reversalType =
    input.original.partyType === FinancialPartyType.SUPPLIER
      ? FinancialTransactionType.SUPPLIER_PAYMENT_REVERSAL
      : input.original.type === FinancialTransactionType.CUSTOMER_REFUND_PAID
        ? FinancialTransactionType.REFUND_REVERSAL
        : FinancialTransactionType.PAYMENT_REVERSAL;

  return postFinancialTransaction(tx, {
    ...input,
    amountCents: input.amountCents,
    creditCents: input.original.debitCents,
    debitCents: input.original.creditCents,
    documentKind: DocumentSequenceKind.ADJUSTMENT,
    metadata: { originalTransactionNumber: input.original.transactionNumber, reason: input.reason },
    partyType: input.original.partyType,
    prefix: "MS/REV",
    type: reversalType,
  });
}

async function postPaymentWithAllocations(
  tx: FinancialTransactionClient,
  input: MultiAllocationPaymentInput & {
    allocationType: FinancialAllocationType;
    documentKind: DocumentSequenceKind;
    partyType: FinancialPartyType;
    prefix: string;
    type: FinancialTransactionType;
  },
) {
  const allocatedCents = input.allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
  if (allocatedCents !== input.amountCents) {
    throw new Error("Payment allocation total must equal payment amount.");
  }

  const existing = await tx.financialTransaction.findUnique({
    where: {
      tenantId_idempotencyKey: {
        idempotencyKey: input.idempotencyKey,
        tenantId: input.tenantId,
      },
    },
  });
  if (existing) return existing;

  const payment = await postFinancialTransaction(tx, {
    ...input,
    creditCents: input.amountCents,
    debitCents: 0,
    documentKind: input.documentKind,
    partyType: input.partyType,
    paymentMode: input.mode,
    prefix: input.prefix,
    provider: input.provider ?? PaymentProvider.MANUAL,
    type: input.type,
  });

  for (const allocation of input.allocations) {
    await tx.financialAllocation.create({
      data: {
        amount: centsToDecimal(allocation.amountCents),
        amountCents: allocation.amountCents,
        fromTransactionId: payment.id,
        hardwareDocumentId: allocation.hardwareDocumentId ?? null,
        invoiceId: allocation.invoiceId ?? null,
        metadata: { idempotencyKey: `${input.idempotencyKey}:allocation:${allocation.targetTransactionId}` },
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        tenantId: input.tenantId,
        toTransactionId: allocation.targetTransactionId,
        type: input.allocationType,
      },
    });
  }

  return payment;
}

async function postFinancialTransaction(
  tx: FinancialTransactionClient,
  input: BasePostingInput & {
    creditCents: number;
    debitCents: number;
    documentKind: DocumentSequenceKind;
    metadata?: Prisma.InputJsonValue;
    partyType: FinancialPartyType;
    paymentMode?: PaymentMode;
    prefix: string;
    provider?: PaymentProvider;
    type: FinancialTransactionType;
  },
) {
  if (input.amountCents <= 0) {
    throw new Error("Financial transaction amount must be positive.");
  }
  if (input.debitCents < 0 || input.creditCents < 0) {
    throw new Error("Financial transaction debit and credit amounts cannot be negative.");
  }
  if (input.debitCents + input.creditCents !== input.amountCents) {
    throw new Error("Financial transaction debit/credit must equal the posted amount.");
  }

  const existing = await tx.financialTransaction.findUnique({
    where: {
      tenantId_idempotencyKey: {
        idempotencyKey: input.idempotencyKey,
        tenantId: input.tenantId,
      },
    },
  });

  if (existing) return existing;

  const sequenceInput = {
    kind: input.documentKind,
    prefix: input.prefix,
    tenantId: input.tenantId,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  };
  const transactionNumber = await allocateDocumentNumber(tx, sequenceInput);

  return tx.financialTransaction.create({
    data: stripUndefined({
      amount: centsToDecimal(input.amountCents),
      amountCents: input.amountCents,
      createdById: input.createdById,
      creditCents: input.creditCents,
      debitCents: input.debitCents,
      externalReference: input.externalReference ?? null,
      hardwareDocumentId: input.hardwareDocumentId ?? null,
      idempotencyKey: input.idempotencyKey,
      invoiceId: input.invoiceId ?? null,
      metadata: input.metadata ?? {},
      notes: input.notes ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      partyId: input.partyId ?? null,
      partyType: input.partyType,
      paymentMode: input.paymentMode,
      sourceId: input.sourceId,
      sourceNumber: input.sourceNumber ?? null,
      sourceType: input.sourceType,
      tenantId: input.tenantId,
      transactionNumber,
      type: input.type,
    }) as Prisma.FinancialTransactionUncheckedCreateInput,
  });
}

function centsToDecimal(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
