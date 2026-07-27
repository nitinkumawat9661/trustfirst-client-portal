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
