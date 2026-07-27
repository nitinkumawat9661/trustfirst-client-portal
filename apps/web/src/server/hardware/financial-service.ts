import {
  BillingTimelineVerb,
  AuditAction,
  FinancialAllocationType,
  FinancialPartyType,
  FinancialTransactionStatus,
  FinancialTransactionType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { AppError } from "../domain/errors";
import {
  postCustomerAdvance,
  postCustomerPaymentWithAllocations,
  postCustomerRefundPaid,
  postFinancialReversal,
  postManualFinancialAdjustment,
  postSupplierAdvance,
  postSupplierPaymentWithAllocations,
} from "../financial/financial-service";
import { PermissionResolverService } from "../permissions";
import type { HardwareCustomerRefundInput, HardwareFinancialAdjustmentInput, HardwarePartyPaymentInput, HardwarePaymentReversalInput } from "./financial-schemas";
import type { HardwarePrintProjection } from "./trade-types";

type ActorContext = { tenantId: string; userId: string };
type PartyRole = "customer" | "supplier";
type FirmPrintDetails = HardwarePrintProjection["firm"];

export type FinancialOpenItem = {
  documentNumber: string;
  dueCents: number;
  hardwareDocumentId: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  occurredAt: Date;
  originalCents: number;
  paidCents: number;
  sourceId: string | null;
  targetTransactionId: string;
};

export type PartyFinancialPosition = {
  advanceBalanceCents: number;
  openItems: FinancialOpenItem[];
  partyId: string;
  partyName: string;
  refundableBalanceCents: number;
  totalOutstandingCents: number;
};

export type HardwareFinancialPrintProjection = {
  allocations: Array<{
    amountCents: number;
    documentNumber: string;
    invoiceNumber: string | null;
    targetNumber: string | null;
  }>;
  amountInWords: string;
  firm: FirmPrintDetails;
  party: {
    address: string | null;
    gstin: string | null;
    name: string;
    phone: string | null;
  } | null;
  signatureLabel: string;
  transaction: {
    amountCents: number;
    externalReference: string | null;
    id: string;
    notes: string | null;
    occurredAt: Date;
    paymentMode: string | null;
    sourceNumber: string | null;
    status: string;
    transactionNumber: string;
    type: string;
  };
};

export class HardwareFinancialService {
  private readonly permissions: PermissionResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
  }

  async partyPosition(context: ActorContext, role: PartyRole, partyId: string): Promise<PartyFinancialPosition> {
    await this.enforce(context, role === "supplier" ? "hardware.purchase.read" : "hardware.sales.read");
    const party = await this.ensureParty(context.tenantId, partyId, role);
    const partyType = role === "supplier" ? FinancialPartyType.SUPPLIER : FinancialPartyType.CUSTOMER;
    const receivableTypes: FinancialTransactionType[] =
      role === "supplier"
        ? [FinancialTransactionType.PURCHASE_PAYABLE]
        : [FinancialTransactionType.SALE_RECEIVABLE];
    const advanceTypes: FinancialTransactionType[] =
      role === "supplier"
        ? [FinancialTransactionType.SUPPLIER_ADVANCE]
        : [FinancialTransactionType.CUSTOMER_ADVANCE];
    const creditTypes: FinancialTransactionType[] =
      role === "supplier"
        ? [FinancialTransactionType.PURCHASE_RETURN_CREDIT, FinancialTransactionType.SUPPLIER_REFUND_RECEIVED]
        : [FinancialTransactionType.SALE_RETURN_CREDIT, FinancialTransactionType.CUSTOMER_REFUND_PENDING];

    const transactions = await this.prisma.financialTransaction.findMany({
      include: { allocationsFrom: true, allocationsTo: true, invoice: true },
      orderBy: { occurredAt: "asc" },
      where: { partyId, partyType, status: FinancialTransactionStatus.POSTED, tenantId: context.tenantId },
    });
    const openItems = transactions
      .filter((transaction) => receivableTypes.includes(transaction.type))
      .map((transaction) => {
        const paidCents = transaction.allocationsTo.reduce((total, allocation) => total + allocation.amountCents, 0);
        return {
          documentNumber: transaction.sourceNumber ?? transaction.transactionNumber,
          dueCents: Math.max(transaction.debitCents - paidCents, 0),
          hardwareDocumentId: transaction.hardwareDocumentId,
          invoiceId: transaction.invoiceId,
          invoiceNumber: transaction.invoice?.invoiceNumber ?? null,
          occurredAt: transaction.occurredAt,
          originalCents: transaction.debitCents,
          paidCents,
          sourceId: transaction.sourceId,
          targetTransactionId: transaction.id,
        };
      })
      .filter((item) => item.dueCents > 0);

    const advanceBalanceCents = transactions
      .filter((transaction) => advanceTypes.includes(transaction.type))
      .reduce((total, transaction) => {
        const usedCents = transaction.allocationsFrom.reduce((sum, allocation) => sum + allocation.amountCents, 0);
        return total + Math.max(transaction.creditCents - usedCents, 0);
      }, 0);
    const refundableBalanceCents = transactions
      .filter((transaction) => creditTypes.includes(transaction.type))
      .reduce((total, transaction) => total + transaction.creditCents, 0) -
      transactions
        .filter((transaction) => transaction.type === FinancialTransactionType.CUSTOMER_REFUND_PAID)
        .reduce((total, transaction) => total + transaction.debitCents, 0);

    return {
      advanceBalanceCents,
      openItems,
      partyId: party.id,
      partyName: party.name,
      refundableBalanceCents,
      totalOutstandingCents: openItems.reduce((total, item) => total + item.dueCents, 0),
    };
  }

  async recordCustomerPayment(context: ActorContext, input: HardwarePartyPaymentInput) {
    await this.enforce(context, "hardware.sales.manage");
    return this.recordPartyPayment(context, "customer", input);
  }

  async recordSupplierPayment(context: ActorContext, input: HardwarePartyPaymentInput) {
    await this.enforce(context, "hardware.purchase.manage");
    return this.recordPartyPayment(context, "supplier", input);
  }

  async reversePayment(context: ActorContext, transactionId: string, input: HardwarePaymentReversalInput) {
    const original = await this.prisma.financialTransaction.findFirst({
      include: { allocationsFrom: true },
      where: {
        id: transactionId,
        status: FinancialTransactionStatus.POSTED,
        tenantId: context.tenantId,
        type: {
          in: [
            FinancialTransactionType.CUSTOMER_PAYMENT,
            FinancialTransactionType.CUSTOMER_ADVANCE,
            FinancialTransactionType.CUSTOMER_REFUND_PAID,
            FinancialTransactionType.SUPPLIER_PAYMENT,
            FinancialTransactionType.SUPPLIER_ADVANCE,
          ],
        },
      },
    });
    if (!original) throw validation("Payment or refund transaction was not found.");
    await this.enforce(
      context,
      original.partyType === FinancialPartyType.SUPPLIER ? "hardware.purchase.manage" : "hardware.sales.manage",
    );

    return this.prisma.$transaction(async (tx) => {
      const reversal = await postFinancialReversal(tx, {
        amountCents: original.amountCents,
        createdById: context.userId,
        externalReference: original.externalReference,
        hardwareDocumentId: original.hardwareDocumentId,
        idempotencyKey: input.idempotencyKey,
        invoiceId: original.invoiceId,
        notes: input.reason,
        original: {
          creditCents: original.creditCents,
          debitCents: original.debitCents,
          id: original.id,
          partyType: original.partyType,
          transactionNumber: original.transactionNumber,
          type: original.type,
        },
        partyId: original.partyId,
        reason: input.reason,
        sourceId: original.id,
        sourceNumber: original.transactionNumber,
        sourceType: "FinancialTransaction",
        tenantId: context.tenantId,
      });

      for (const allocation of original.allocationsFrom) {
        if (allocation.invoiceId) {
          await this.adjustInvoicePaidAmount(tx, context.tenantId, allocation.invoiceId, -allocation.amountCents);
        }
        await tx.financialAllocation.create({
          data: {
            amount: centsToDecimal(allocation.amountCents),
            amountCents: allocation.amountCents,
            fromTransactionId: reversal.id,
            hardwareDocumentId: allocation.hardwareDocumentId,
            invoiceId: allocation.invoiceId,
            metadata: { reason: input.reason, reversedAllocationId: allocation.id },
            sourceId: original.id,
            sourceType: "FinancialTransaction",
            tenantId: context.tenantId,
            toTransactionId: allocation.toTransactionId,
            type: FinancialAllocationType.PAYMENT_REVERSAL,
          },
        });
      }

      return reversal;
    });
  }

  async recordCustomerRefund(context: ActorContext, input: HardwareCustomerRefundInput) {
    await this.enforce(context, "hardware.sales.manage");
    await this.ensureParty(context.tenantId, input.partyId, "customer");
    const position = await this.partyPosition(context, "customer", input.partyId);
    if (input.amountCents > position.refundableBalanceCents) {
      throw validation("Refund amount exceeds the current refundable customer credit.");
    }
    return this.prisma.$transaction((tx) =>
      postCustomerRefundPaid(tx, {
        amountCents: input.amountCents,
        createdById: context.userId,
        externalReference: input.reference ?? null,
        idempotencyKey: input.idempotencyKey,
        mode: input.mode,
        notes: input.notes ?? null,
        partyId: input.partyId,
        sourceId: input.partyId,
        sourceNumber: null,
        sourceType: "ClientOrganization",
        tenantId: context.tenantId,
      }),
    );
  }

  async recordAdjustment(context: ActorContext, input: HardwareFinancialAdjustmentInput) {
    await this.enforce(context, input.role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage");
    await this.ensureParty(context.tenantId, input.partyId, input.role);
    const partyType = input.role === "supplier" ? FinancialPartyType.SUPPLIER : FinancialPartyType.CUSTOMER;
    const occurredAt = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
    if (Number.isNaN(occurredAt.getTime())) throw validation("Effective date is invalid.");

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await postManualFinancialAdjustment(tx, {
        amountCents: input.amountCents,
        createdById: context.userId,
        direction: input.direction,
        externalReference: input.reference ?? null,
        idempotencyKey: input.idempotencyKey,
        notes: input.notes ?? null,
        occurredAt,
        partyId: input.partyId,
        partyType,
        reason: input.reason,
        sourceId: input.partyId,
        sourceNumber: input.reference ?? null,
        sourceType: "ClientOrganization",
        tenantId: context.tenantId,
      });
      await tx.auditEvent.create({
        data: {
          actorId: context.userId,
          action: AuditAction.BILLING_PAYMENT_RECORDED,
          metadata: {
            auditAction: "hardware.financial.adjustment.posted",
            amountCents: input.amountCents,
            direction: input.direction,
            idempotencyKey: input.idempotencyKey,
            notes: input.notes ?? null,
            partyId: input.partyId,
            reason: input.reason,
            reference: input.reference ?? null,
            role: input.role,
          },
          targetId: adjustment.id,
          targetType: "FinancialTransaction",
          tenantId: context.tenantId,
        },
      });
      return adjustment;
    });
  }

  private async recordPartyPayment(context: ActorContext, role: PartyRole, input: HardwarePartyPaymentInput) {
    await this.ensureParty(context.tenantId, input.partyId, role);
    const position = await this.partyPosition(context, role, input.partyId);
    const openItems = new Map(position.openItems.map((item) => [item.targetTransactionId, item]));
    const allocationTotal = input.allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
    if (allocationTotal > input.amountCents) throw validation("Allocation total cannot exceed the payment amount.");
    if (input.amountCents > allocationTotal && !input.excessAsAdvance) {
      throw validation("Confirm excess amount as advance before posting.");
    }
    for (const allocation of input.allocations) {
      const target = openItems.get(allocation.targetTransactionId);
      if (!target) throw validation("Allocation target was not found or is already settled.");
      if (allocation.amountCents > target.dueCents) {
        throw validation(`Allocation for ${target.documentNumber} exceeds outstanding balance.`);
      }
    }
    const allocationPayload = input.allocations.map((allocation) => {
      const target = openItems.get(allocation.targetTransactionId);
      if (!target) throw validation("Allocation target was not found or is already settled.");
      return {
        amountCents: allocation.amountCents,
        hardwareDocumentId: target.hardwareDocumentId,
        invoiceId: target.invoiceId,
        targetTransactionId: allocation.targetTransactionId,
      };
    });
    const advanceCents = input.amountCents - allocationTotal;

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const payment =
        allocationTotal > 0
          ? role === "supplier"
            ? await postSupplierPaymentWithAllocations(tx, {
                allocations: allocationPayload,
                amountCents: allocationTotal,
                createdById: context.userId,
                externalReference: input.reference ?? null,
                idempotencyKey: `${input.idempotencyKey}:allocated`,
                mode: input.mode,
                notes: input.notes ?? null,
                occurredAt: now,
                partyId: input.partyId,
                sourceId: input.partyId,
                sourceType: "ClientOrganization",
                tenantId: context.tenantId,
              })
            : await postCustomerPaymentWithAllocations(tx, {
                allocations: allocationPayload,
                amountCents: allocationTotal,
                createdById: context.userId,
                externalReference: input.reference ?? null,
                idempotencyKey: `${input.idempotencyKey}:allocated`,
                mode: input.mode,
                notes: input.notes ?? null,
                occurredAt: now,
                partyId: input.partyId,
                sourceId: input.partyId,
                sourceType: "ClientOrganization",
                tenantId: context.tenantId,
              })
          : null;

      for (const allocation of allocationPayload) {
        if (role === "customer" && allocation.invoiceId) {
          await this.adjustInvoicePaidAmount(tx, context.tenantId, allocation.invoiceId, allocation.amountCents);
          await tx.billingTimelineEvent.create({
            data: {
              actorId: context.userId,
              invoiceId: allocation.invoiceId,
              metadata: { idempotencyKey: input.idempotencyKey, source: "hardware-financial-payment" },
              summary: `Recorded customer payment ${payment?.transactionNumber ?? ""}`.trim(),
              tenantId: context.tenantId,
              verb: BillingTimelineVerb.PAYMENT_RECORDED,
            },
          });
        }
      }

      const advance =
        advanceCents > 0
          ? role === "supplier"
            ? await postSupplierAdvance(tx, {
                amountCents: advanceCents,
                createdById: context.userId,
                externalReference: input.reference ?? null,
                idempotencyKey: `${input.idempotencyKey}:advance`,
                mode: input.mode,
                notes: input.notes ?? null,
                occurredAt: now,
                partyId: input.partyId,
                sourceId: input.partyId,
                sourceType: "ClientOrganization",
                tenantId: context.tenantId,
              })
            : await postCustomerAdvance(tx, {
                amountCents: advanceCents,
                createdById: context.userId,
                externalReference: input.reference ?? null,
                idempotencyKey: `${input.idempotencyKey}:advance`,
                mode: input.mode,
                notes: input.notes ?? null,
                occurredAt: now,
                partyId: input.partyId,
                sourceId: input.partyId,
                sourceType: "ClientOrganization",
                tenantId: context.tenantId,
              })
          : null;

      return {
        advance,
        allocatedCents: allocationTotal,
        payment,
        printTransactionId: payment?.id ?? advance?.id ?? null,
        receiptNumber: payment?.transactionNumber ?? advance?.transactionNumber ?? null,
      };
    });
  }

  async transactionPrintProjection(context: ActorContext, transactionId: string): Promise<HardwareFinancialPrintProjection> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      include: {
        allocationsFrom: {
          include: {
            hardwareDocument: { select: { documentNumber: true } },
            invoice: { select: { invoiceNumber: true } },
            toTransaction: { select: { sourceNumber: true, transactionNumber: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        party: {
          include: {
            contacts: {
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              select: { phone: true },
              take: 1,
            },
          },
        },
      },
      where: {
        id: transactionId,
        tenantId: context.tenantId,
        type: {
          in: [
            FinancialTransactionType.CUSTOMER_PAYMENT,
            FinancialTransactionType.CUSTOMER_ADVANCE,
            FinancialTransactionType.CUSTOMER_REFUND_PAID,
            FinancialTransactionType.SUPPLIER_PAYMENT,
            FinancialTransactionType.SUPPLIER_ADVANCE,
            FinancialTransactionType.SUPPLIER_PAYMENT_REVERSAL,
            FinancialTransactionType.PAYMENT_REVERSAL,
            FinancialTransactionType.REFUND_REVERSAL,
          ],
        },
      },
    });
    if (!transaction) throw validation("Printable financial transaction was not found.");
    await this.enforce(
      context,
      transaction.partyType === FinancialPartyType.SUPPLIER ? "hardware.purchase.read" : "hardware.sales.read",
    );
    const [settings, tenant] = await Promise.all([
      this.prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: context.tenantId } }),
      this.prisma.tenant.findUnique({
        select: { branding: true },
        where: { id: context.tenantId },
      }),
    ]);
    const branding = asRecord(tenant?.branding);
    const officialIdentity = asRecord(branding.officialIdentity);
    const logo = asRecord(branding.logo);
    const identityLocked = officialIdentity.status === "LOCKED";
    return {
      allocations: transaction.allocationsFrom.map((allocation) => ({
        amountCents: allocation.amountCents,
        documentNumber: allocation.hardwareDocument?.documentNumber ?? allocation.toTransaction?.sourceNumber ?? "-",
        invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
        targetNumber: allocation.toTransaction?.transactionNumber ?? null,
      })),
      amountInWords: amountInWords(transaction.amountCents),
      firm: {
        address: (settings?.address ?? {}) as Record<string, unknown>,
        email: settings?.email ?? null,
        firmName: settings?.firmName ?? "Configured Firm",
        gstin: settings?.gstin ?? null,
        legalName: identityLocked && typeof officialIdentity.legalName === "string" ? officialIdentity.legalName : null,
        logoUrl: identityLocked && typeof logo.assetKey === "string" ? "/api/tenants/branding/logo" : null,
        logoPlaceholder: settings?.logoPlaceholder ?? null,
        phone: settings?.phone ?? null,
        proprietorName:
          identityLocked && typeof officialIdentity.proprietorName === "string"
            ? officialIdentity.proprietorName
            : null,
        tagline: identityLocked && typeof branding.tagline === "string" ? branding.tagline : null,
        termsFooter: settings?.termsFooter ?? null,
      },
      party: transaction.party ? {
        address: readString(asRecord(transaction.party.customFields).address),
        gstin: readString(asRecord(transaction.party.customFields).gstin),
        name: transaction.party.name,
        phone: transaction.party.contacts?.[0]?.phone ?? readString(asRecord(transaction.party.customFields).phone),
      } : null,
      signatureLabel: transaction.partyType === FinancialPartyType.SUPPLIER ? "Paid by" : "Received by",
      transaction: {
        amountCents: transaction.amountCents,
        externalReference: transaction.externalReference,
        id: transaction.id,
        notes: transaction.notes,
        occurredAt: transaction.occurredAt,
        paymentMode: transaction.paymentMode,
        sourceNumber: transaction.sourceNumber,
        status: transaction.status,
        transactionNumber: transaction.transactionNumber,
        type: transaction.type,
      },
    };
  }

  private async adjustInvoicePaidAmount(
    tx: Prisma.TransactionClient,
    tenantId: string,
    invoiceId: string,
    deltaCents: number,
  ) {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw validation("Invoice was not found.");
    const paidAmountCents = Math.max(invoice.paidAmountCents + deltaCents, 0);
    const status =
      paidAmountCents >= invoice.totalAmountCents
        ? InvoiceStatus.PAID
        : paidAmountCents > 0
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.ISSUED;
    await tx.invoice.update({
      data: {
        paidAmountCents,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
        status,
      },
      where: { id: invoice.id },
    });
  }

  private async ensureParty(tenantId: string, partyId: string, role: PartyRole) {
    const party = await this.prisma.clientOrganization.findFirst({
      where: { archivedAt: null, deletedAt: null, id: partyId, tenantId },
    });
    if (!party || asRecord(party.customFields).hardwarePartyRole !== role) {
      throw validation(`${role === "supplier" ? "Supplier" : "Customer"} was not found.`);
    }
    return party;
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

function centsToDecimal(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function amountInWords(amountCents: number) {
  const rupees = Math.floor(amountCents / 100);
  const paise = Math.abs(amountCents % 100);
  const words = rupees === 0 ? "Zero" : integerToIndianWords(rupees);
  return paise > 0 ? `${words} rupees and ${integerToIndianWords(paise)} paise only` : `${words} rupees only`;
}

function integerToIndianWords(value: number): string {
  if (value === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underHundred = (num: number) => num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`;
  const underThousand = (num: number) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? underHundred(rest) : ""}`.trim();
  };
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1000);
  const rest = value % 1000;
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
