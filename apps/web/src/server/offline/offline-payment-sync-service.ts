import {
  AuditAction,
  BillingTimelineVerb,
  FinancialPartyType,
  FinancialTransactionStatus,
  FinancialTransactionType,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { QueuedMutation } from "../../lib/offline-queue";
import { AppError } from "../domain/errors";
import {
  postCustomerAdvance,
  postCustomerPaymentWithAllocations,
  postSupplierAdvance,
  postSupplierPaymentWithAllocations,
} from "../financial/financial-service";
import {
  hardwarePartyPaymentSchema,
  type HardwarePartyPaymentInput,
} from "../hardware/financial-schemas";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";

const expectedTargetSchema = z.object({
  dueCents: z.number().int().positive(),
  targetTransactionId: z.string().trim().min(1),
});

const paymentPayloadSchema = z.object({
  expectedTargets: z.array(expectedTargetSchema).max(100),
  input: z.record(z.string(), z.unknown()),
  role: z.enum(["customer", "supplier"]),
});

const paymentSyncItemSchema = z.object({
  action: z.literal("hardware.partyPaymentDraft.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(12).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

const storedPaymentResultSchema = z.object({
  advanceCents: z.number().int().nonnegative(),
  advanceTransactionId: z.string().nullable(),
  allocatedCents: z.number().int().nonnegative(),
  amountCents: z.number().int().positive(),
  occurredAt: z.string(),
  partyId: z.string(),
  partyName: z.string(),
  paymentTransactionId: z.string().nullable(),
  printTransactionId: z.string().nullable(),
  receiptNumber: z.string().nullable(),
  role: z.enum(["customer", "supplier"]),
});

type SyncReceiptRow = { result: unknown; status: string };
type LockedPartyRow = { customFields: unknown; id: string; name: string };
type LockedTargetRow = {
  debitCents: number;
  hardwareDocumentId: string | null;
  id: string;
  invoiceId: string | null;
  partyId: string | null;
  partyType: FinancialPartyType;
  sourceNumber: string | null;
  status: FinancialTransactionStatus;
  transactionNumber: string;
  type: FinancialTransactionType;
};

type ExpectedTarget = z.infer<typeof expectedTargetSchema>;
export type OfflinePaymentSyncSuccess = z.infer<typeof storedPaymentResultSchema>;

export class OfflinePaymentSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(
    device: AuthenticatedOfflineDevice,
    rawItem: unknown,
  ): Promise<OfflinePaymentSyncSuccess> {
    const item = paymentSyncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued payment belongs to a different tenant or user.");
    }
    const payload = paymentPayloadSchema.parse(item.payload);
    enforcePermission(device.permissions, payload.role);
    const input = hardwarePartyPaymentSchema.parse(payload.input);
    validatePaymentShape(input, payload.expectedTargets);

    return this.prisma.$transaction(async (tx) => {
      for (const lock of paymentIdentityLockKeys(device, item.id, item.idempotencyKey)) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
      }
      const receipt = await findReceipt(tx, device, item.id, item.idempotencyKey);
      if (receipt?.status === "SUCCESS") return parseStoredResult(receipt.result);
      if (receipt) {
        throw conflict("This payment already has a non-success sync receipt and requires review.");
      }

      const party = await lockParty(tx, device.tenantId, input.partyId, payload.role);
      if (await findExistingPosting(tx, device.tenantId, item.idempotencyKey)) {
        throw conflict("A financial posting exists without its offline sync receipt. Review it before retrying.");
      }

      const targets = await lockAndValidateTargets(
        tx,
        device.tenantId,
        input,
        payload.role,
        payload.expectedTargets,
      );
      const allocationTotal = input.allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
      const advanceCents = input.amountCents - allocationTotal;
      const occurredAt = new Date();
      const offlineMetadata = {
        offlineDeviceId: device.id,
        offlineIdempotencyKey: item.idempotencyKey,
        offlineSyncQueueItemId: item.id,
        offlineSyncedAt: occurredAt.toISOString(),
      } as Prisma.InputJsonValue;
      const metadataCarrier = { metadata: offlineMetadata };
      const allocationPayload = input.allocations.map((allocation) => {
        const target = targets.get(allocation.targetTransactionId);
        if (!target) throw conflict("Payment allocation target is no longer available.");
        return {
          amountCents: allocation.amountCents,
          hardwareDocumentId: target.hardwareDocumentId,
          invoiceId: target.invoiceId,
          targetTransactionId: target.id,
        };
      });
      const commonPosting = {
        createdById: device.userId,
        externalReference: input.reference ?? null,
        mode: input.mode,
        notes: input.notes ?? null,
        occurredAt,
        partyId: input.partyId,
        sourceId: item.id,
        sourceNumber: null,
        sourceType: "OfflineQueueItem",
        tenantId: device.tenantId,
        ...metadataCarrier,
      };

      const payment = allocationTotal > 0
        ? payload.role === "supplier"
          ? await postSupplierPaymentWithAllocations(tx, {
              ...commonPosting,
              allocations: allocationPayload,
              amountCents: allocationTotal,
              idempotencyKey: `${item.idempotencyKey}:allocated`,
            })
          : await postCustomerPaymentWithAllocations(tx, {
              ...commonPosting,
              allocations: allocationPayload,
              amountCents: allocationTotal,
              idempotencyKey: `${item.idempotencyKey}:allocated`,
            })
        : null;

      if (payload.role === "customer") {
        for (const allocation of allocationPayload) {
          if (!allocation.invoiceId) continue;
          await adjustInvoicePaidAmount(tx, device.tenantId, allocation.invoiceId, allocation.amountCents);
          await tx.billingTimelineEvent.create({
            data: {
              actorId: device.userId,
              invoiceId: allocation.invoiceId,
              metadata: {
                idempotencyKey: item.idempotencyKey,
                offlineDeviceId: device.id,
                offlineQueueItemId: item.id,
                source: "offline-hardware-financial-payment",
              },
              summary: `Recorded customer payment ${payment?.transactionNumber ?? ""}`.trim(),
              tenantId: device.tenantId,
              verb: BillingTimelineVerb.PAYMENT_RECORDED,
            },
          });
        }
      }

      const advance = advanceCents > 0
        ? payload.role === "supplier"
          ? await postSupplierAdvance(tx, {
              ...commonPosting,
              amountCents: advanceCents,
              idempotencyKey: `${item.idempotencyKey}:advance`,
            })
          : await postCustomerAdvance(tx, {
              ...commonPosting,
              amountCents: advanceCents,
              idempotencyKey: `${item.idempotencyKey}:advance`,
            })
        : null;

      const printTransaction = payment ?? advance;
      await tx.auditEvent.create({
        data: {
          action: AuditAction.BILLING_PAYMENT_RECORDED,
          actorId: device.userId,
          metadata: {
            advanceCents,
            allocatedCents: allocationTotal,
            offlineDeviceId: device.id,
            offlineQueueItemId: item.id,
            paymentMode: input.mode,
            role: payload.role,
          },
          targetId: printTransaction?.id ?? input.partyId,
          targetType: printTransaction ? "FinancialTransaction" : "ClientOrganization",
          tenantId: device.tenantId,
        },
      });

      const result: OfflinePaymentSyncSuccess = {
        advanceCents,
        advanceTransactionId: advance?.id ?? null,
        allocatedCents: allocationTotal,
        amountCents: input.amountCents,
        occurredAt: occurredAt.toISOString(),
        partyId: input.partyId,
        partyName: party.name,
        paymentTransactionId: payment?.id ?? null,
        printTransactionId: printTransaction?.id ?? null,
        receiptNumber: printTransaction?.transactionNumber ?? null,
        role: payload.role,
      };
      await saveSuccessReceipt(tx, device, item, result);
      return result;
    });
  }
}

function validatePaymentShape(
  input: HardwarePartyPaymentInput,
  expectedTargets: ExpectedTarget[],
) {
  const allocationIds = input.allocations.map((allocation) => allocation.targetTransactionId);
  if (new Set(allocationIds).size !== allocationIds.length) {
    throw validation("The same invoice or bill cannot be allocated more than once.");
  }
  const expectedIds = expectedTargets.map((target) => target.targetTransactionId);
  if (new Set(expectedIds).size !== expectedIds.length) {
    throw validation("Expected payment targets contain duplicates.");
  }
  if (
    allocationIds.length !== expectedIds.length
    || allocationIds.some((id) => !expectedIds.includes(id))
  ) {
    throw validation("Every queued payment allocation requires its expected outstanding balance.");
  }
  const allocationTotal = input.allocations.reduce((total, allocation) => total + allocation.amountCents, 0);
  if (allocationTotal > input.amountCents) {
    throw validation("Allocation total cannot exceed the payment amount.");
  }
  if (input.amountCents > allocationTotal && !input.excessAsAdvance) {
    throw validation("Confirm excess amount as advance before posting.");
  }
}

async function lockParty(
  tx: Prisma.TransactionClient,
  tenantId: string,
  partyId: string,
  role: "customer" | "supplier",
) {
  const rows = await tx.$queryRaw<LockedPartyRow[]>`
    SELECT "id", "name", "customFields"
    FROM "ClientOrganization"
    WHERE "id" = ${partyId}
      AND "tenantId" = ${tenantId}
      AND "archivedAt" IS NULL
      AND "deletedAt" IS NULL
    FOR UPDATE
  `;
  const party = rows[0];
  if (!party || !partyHasRole(party.customFields, role)) {
    throw validation(`${role === "supplier" ? "Supplier" : "Customer"} was not found.`);
  }
  return party;
}

async function lockAndValidateTargets(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: HardwarePartyPaymentInput,
  role: "customer" | "supplier",
  expectedTargets: ExpectedTarget[],
) {
  if (input.allocations.length === 0) return new Map<string, LockedTargetRow>();
  const ids = [...new Set(input.allocations.map((allocation) => allocation.targetTransactionId))].sort();
  const rows: LockedTargetRow[] = [];
  for (const id of ids) {
    const locked = await tx.$queryRaw<LockedTargetRow[]>`
      SELECT
        "id", "debitCents", "hardwareDocumentId", "invoiceId", "partyId", "partyType",
        "sourceNumber", "status", "transactionNumber", "type"
      FROM "FinancialTransaction"
      WHERE "tenantId" = ${tenantId}
        AND "id" = ${id}
      FOR UPDATE
    `;
    if (locked[0]) rows.push(locked[0]);
  }
  if (rows.length !== ids.length) {
    throw conflict("One or more payment targets no longer exist.");
  }

  const allocationSums = await tx.financialAllocation.groupBy({
    _sum: { amountCents: true },
    by: ["toTransactionId"],
    where: { tenantId, toTransactionId: { in: ids } },
  });
  const allocatedByTarget = new Map(
    allocationSums.map((row) => [row.toTransactionId, row._sum.amountCents ?? 0]),
  );
  const expectedByTarget = new Map(
    expectedTargets.map((target) => [target.targetTransactionId, target.dueCents]),
  );
  const inputByTarget = new Map(
    input.allocations.map((allocation) => [allocation.targetTransactionId, allocation.amountCents]),
  );
  const expectedPartyType = role === "supplier" ? FinancialPartyType.SUPPLIER : FinancialPartyType.CUSTOMER;
  const expectedTransactionType = role === "supplier"
    ? FinancialTransactionType.PURCHASE_PAYABLE
    : FinancialTransactionType.SALE_RECEIVABLE;
  const result = new Map<string, LockedTargetRow>();

  for (const row of rows) {
    if (
      row.partyId !== input.partyId
      || row.partyType !== expectedPartyType
      || row.type !== expectedTransactionType
      || row.status !== FinancialTransactionStatus.POSTED
    ) {
      throw conflict("A payment target no longer belongs to the selected party or role.");
    }
    const currentDue = Math.max(row.debitCents - (allocatedByTarget.get(row.id) ?? 0), 0);
    const expectedDue = expectedByTarget.get(row.id);
    if (expectedDue !== currentDue) {
      throw conflict(
        `${row.sourceNumber ?? row.transactionNumber} outstanding changed from ${expectedDue ?? "unknown"} to ${currentDue} before sync. Review the payment manually.`,
      );
    }
    const requested = inputByTarget.get(row.id) ?? 0;
    if (requested > currentDue) {
      throw conflict(`Allocation for ${row.sourceNumber ?? row.transactionNumber} exceeds current outstanding.`);
    }
    result.set(row.id, row);
  }
  return result;
}

async function adjustInvoicePaidAmount(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string,
  deltaCents: number,
) {
  const invoices = await tx.$queryRaw<Array<{
    id: string;
    paidAmountCents: number;
    totalAmountCents: number;
  }>>`
    SELECT "id", "paidAmountCents", "totalAmountCents"
    FROM "Invoice"
    WHERE "id" = ${invoiceId}
      AND "tenantId" = ${tenantId}
    FOR UPDATE
  `;
  const invoice = invoices[0];
  if (!invoice) throw conflict("Allocated invoice was not found.");
  const paidAmountCents = Math.max(invoice.paidAmountCents + deltaCents, 0);
  const status = paidAmountCents >= invoice.totalAmountCents
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

function paymentIdentityLockKeys(
  device: Pick<AuthenticatedOfflineDevice, "id" | "tenantId">,
  queueItemId: string,
  idempotencyKey: string,
) {
  return [
    `offline-payment:${device.tenantId}:${device.id}:item:${queueItemId}`,
    `offline-payment:${device.tenantId}:${device.id}:idempotency:${idempotencyKey}`,
  ].sort();
}

async function findExistingPosting(
  tx: Prisma.TransactionClient,
  tenantId: string,
  idempotencyKey: string,
) {
  return tx.financialTransaction.findFirst({
    select: { id: true },
    where: {
      idempotencyKey: { in: [`${idempotencyKey}:allocated`, `${idempotencyKey}:advance`] },
      tenantId,
    },
  });
}

async function findReceipt(
  tx: Prisma.TransactionClient,
  device: AuthenticatedOfflineDevice,
  queueItemId: string,
  idempotencyKey: string,
) {
  const rows = await tx.$queryRaw<SyncReceiptRow[]>`
    SELECT "result", "status"
    FROM "OfflineSyncReceipt"
    WHERE "tenantId" = ${device.tenantId}
      AND "deviceId" = ${device.id}
      AND ("queueItemId" = ${queueItemId} OR "idempotencyKey" = ${idempotencyKey})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function saveSuccessReceipt(
  tx: Prisma.TransactionClient,
  device: AuthenticatedOfflineDevice,
  item: Pick<QueuedMutation, "action" | "id" | "idempotencyKey">,
  result: OfflinePaymentSyncSuccess,
) {
  const resultJson = JSON.stringify(result);
  await tx.$executeRaw`
    INSERT INTO "OfflineSyncReceipt" (
      "id", "tenantId", "deviceId", "queueItemId", "idempotencyKey", "action",
      "status", "result", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${device.tenantId}, ${device.id}, ${item.id}, ${item.idempotencyKey}, ${item.action},
      'SUCCESS', ${resultJson}::jsonb, NOW(), NOW()
    )
    ON CONFLICT ("deviceId", "queueItemId")
    DO UPDATE SET "status" = 'SUCCESS', "result" = EXCLUDED."result", "updatedAt" = NOW()
  `;
}

function enforcePermission(
  permissions: string[],
  role: "customer" | "supplier",
) {
  const permission = role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage";
  if (
    !permissions.includes("*")
    && !permissions.includes("hardware.plugin.manage")
    && !permissions.includes(permission)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `The enrolled device no longer has permission to sync ${role} payments.`,
      status: 403,
    });
  }
}

function partyHasRole(value: unknown, role: "customer" | "supplier") {
  const fields = asRecord(value);
  const roles = Array.isArray(fields.hardwarePartyRoles)
    ? fields.hardwarePartyRoles.filter((entry): entry is string => typeof entry === "string")
    : [];
  return fields.hardwarePartyRole === role || roles.includes(role);
}

function parseStoredResult(value: unknown): OfflinePaymentSyncSuccess {
  const parsed = storedPaymentResultSchema.safeParse(value);
  if (!parsed.success) throw conflict("Stored payment sync receipt is invalid.");
  return parsed.data;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

function conflict(message: string) {
  return new AppError({ code: "CONFLICT", message, status: 409 });
}

export const offlinePaymentSyncTestUtils = {
  paymentIdentityLockKeys,
  validatePaymentShape,
};
