import {
  FinancialTransactionStatus,
  FinancialTransactionType,
  PaymentMode,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import type { HardwareDayClosingCloseInput, HardwareDayClosingReopenInput } from "./day-closing-schemas";

type ActorContext = { tenantId: string; userId: string };

export type HardwareDayClosingTotals = {
  bankSalesCents: number;
  cardSalesCents: number;
  cashSalesCents: number;
  cashSupplierPaymentsCents: number;
  creditSalesCents: number;
  customerPaymentsCents: number;
  customerRefundsCents: number;
  customerRefundsCashCents: number;
  purchaseReturnsCents: number;
  purchasesCents: number;
  saleReturnsCents: number;
  supplierPaymentsCents: number;
  supplierRefundsCents: number;
  upiSalesCents: number;
};

export type HardwareDayClosingSummary = {
  businessDate: string;
  closing: {
    closedAt: Date;
    countedCashCents: number;
    differenceCents: number;
    expectedCashCents: number;
    id: string;
    notes: string | null;
    openingCashCents: number;
    reopenReason: string | null;
    reopenedAt: Date | null;
    status: string;
  } | null;
  expectedCashCents: number;
  totals: HardwareDayClosingTotals;
};

const customerPaymentTypes = new Set<FinancialTransactionType>([
  FinancialTransactionType.CUSTOMER_PAYMENT,
  FinancialTransactionType.CUSTOMER_ADVANCE,
]);

const supplierPaymentTypes = new Set<FinancialTransactionType>([
  FinancialTransactionType.SUPPLIER_PAYMENT,
  FinancialTransactionType.SUPPLIER_ADVANCE,
]);

export class HardwareDayClosingService {
  private readonly permissions: PermissionResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
  }

  async summary(context: ActorContext, businessDate = indiaBusinessDate()) {
    await this.enforce(context, "hardware.sales.read");
    const totals = await this.calculateTotals(context.tenantId, businessDate);
    const closing = await this.prisma.hardwareDayClosing.findUnique({
      where: { tenantId_businessDate: { businessDate, tenantId: context.tenantId } },
    });
    const openingCashCents = closing?.openingCashCents ?? 0;
    return {
      businessDate,
      closing: closing ? {
        closedAt: closing.closedAt,
        countedCashCents: closing.countedCashCents,
        differenceCents: closing.differenceCents,
        expectedCashCents: closing.expectedCashCents,
        id: closing.id,
        notes: closing.notes,
        openingCashCents: closing.openingCashCents,
        reopenReason: closing.reopenReason,
        reopenedAt: closing.reopenedAt,
        status: closing.status,
      } : null,
      expectedCashCents: expectedCash(openingCashCents, totals),
      totals,
    } satisfies HardwareDayClosingSummary;
  }

  async close(context: ActorContext, input: HardwareDayClosingCloseInput) {
    await this.enforce(context, "hardware.sales.manage");
    const businessDate = input.businessDate ?? indiaBusinessDate();
    const existing = await this.prisma.hardwareDayClosing.findUnique({
      where: { tenantId_businessDate: { businessDate, tenantId: context.tenantId } },
    });
    if (existing?.status === "CLOSED") {
      throw validation("This business date is already closed.");
    }
    const totals = await this.calculateTotals(context.tenantId, businessDate);
    const expectedCashCents = expectedCash(input.openingCashCents, totals);
    const differenceCents = input.countedCashCents - expectedCashCents;
    const data = {
      businessDate,
      closedAt: new Date(),
      closedById: context.userId,
      countedCashCents: input.countedCashCents,
      differenceCents,
      expectedCashCents,
      metadata: { source: "hardware-day-closing" },
      notes: input.notes ?? null,
      openingCashCents: input.openingCashCents,
      status: "CLOSED",
      tenantId: context.tenantId,
      totals: totals as unknown as Prisma.InputJsonValue,
    };
    const closing = existing
      ? await this.prisma.hardwareDayClosing.update({
          data: {
            ...data,
            reopenReason: existing.reopenReason,
            reopenedAt: existing.reopenedAt,
            reopenedById: existing.reopenedById,
          },
          where: { id: existing.id },
        })
      : await this.prisma.hardwareDayClosing.create({ data });
    return closing;
  }

  async reopen(context: ActorContext, closingId: string, input: HardwareDayClosingReopenInput) {
    await this.enforce(context, "hardware.sales.manage");
    const closing = await this.prisma.hardwareDayClosing.findFirst({
      where: { id: closingId, status: "CLOSED", tenantId: context.tenantId },
    });
    if (!closing) throw validation("Closed business date was not found.");
    return this.prisma.hardwareDayClosing.update({
      data: {
        reopenReason: input.reason,
        reopenedAt: new Date(),
        reopenedById: context.userId,
        status: "REOPENED",
      },
      where: { id: closing.id },
    });
  }

  private async calculateTotals(tenantId: string, businessDate: string): Promise<HardwareDayClosingTotals> {
    const { gte, lt } = indiaBusinessDateRange(businessDate);
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        occurredAt: { gte, lt },
        status: FinancialTransactionStatus.POSTED,
        tenantId,
      },
    });
    const customerPayments = transactions.filter((transaction) => customerPaymentTypes.has(transaction.type));
    const supplierPayments = transactions.filter((transaction) => supplierPaymentTypes.has(transaction.type));
    return {
      bankSalesCents: sumByMode(customerPayments, PaymentMode.BANK_TRANSFER),
      cardSalesCents: sumByMode(customerPayments, PaymentMode.CARD),
      cashSalesCents: sumByMode(customerPayments, PaymentMode.CASH),
      cashSupplierPaymentsCents: sumByMode(supplierPayments, PaymentMode.CASH),
      creditSalesCents: sumByType(transactions, FinancialTransactionType.SALE_RECEIVABLE) - sumTransactions(customerPayments),
      customerPaymentsCents: sumTransactions(customerPayments),
      customerRefundsCents: sumByType(transactions, FinancialTransactionType.CUSTOMER_REFUND_PAID),
      customerRefundsCashCents: sumByMode(
        transactions.filter((transaction) => transaction.type === FinancialTransactionType.CUSTOMER_REFUND_PAID),
        PaymentMode.CASH,
      ),
      purchaseReturnsCents: sumByType(transactions, FinancialTransactionType.PURCHASE_RETURN_CREDIT),
      purchasesCents: sumByType(transactions, FinancialTransactionType.PURCHASE_PAYABLE),
      saleReturnsCents: sumByType(transactions, FinancialTransactionType.SALE_RETURN_CREDIT),
      supplierPaymentsCents: sumTransactions(supplierPayments),
      supplierRefundsCents: sumByType(transactions, FinancialTransactionType.SUPPLIER_REFUND_RECEIVED),
      upiSalesCents: sumByMode(customerPayments, PaymentMode.UPI),
    };
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

function expectedCash(openingCashCents: number, totals: HardwareDayClosingTotals) {
  return openingCashCents + totals.cashSalesCents - cashOutCents(totals);
}

function cashOutCents(totals: HardwareDayClosingTotals) {
  return totals.customerRefundsCashCents + totals.cashSupplierPaymentsCents;
}

function sumByMode(transactions: Array<{ amountCents: number; paymentMode: PaymentMode | null }>, mode: PaymentMode) {
  return transactions
    .filter((transaction) => transaction.paymentMode === mode)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

function sumByType(transactions: Array<{ amountCents: number; type: FinancialTransactionType }>, type: FinancialTransactionType) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

function sumTransactions(transactions: Array<{ amountCents: number }>) {
  return transactions.reduce((total, transaction) => total + transaction.amountCents, 0);
}

function indiaBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function indiaBusinessDateRange(businessDate: string) {
  const gte = new Date(`${businessDate}T00:00:00+05:30`);
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
