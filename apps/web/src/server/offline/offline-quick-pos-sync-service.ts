import type { PrismaClient } from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  formatOfflineNumber,
  type OfflineNumberLease,
  type OfflineNumberSeries,
} from "../../lib/offline-data";
import type { QueuedMutation } from "../../lib/offline-queue";
import { AppError } from "../domain/errors";
import { quickPosSaleSchema } from "../hardware/trade-schemas";
import { HardwareTradeService } from "../hardware/trade-service";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";
import { runWithOfflineQuickPosNumbers } from "./offline-number-context";

const reservedNumberSchema = z.object({
  leaseId: z.string().uuid(),
  leaseValue: z.number().int().positive(),
});

const quickPosPayloadSchema = z.object({
  input: z.record(z.string(), z.unknown()),
  invoice: reservedNumberSchema.extend({
    invoiceNumber: z.string().trim().min(1).max(100),
  }),
  trade: reservedNumberSchema.extend({
    documentNumber: z.string().trim().min(1).max(80),
  }),
});

const quickPosSyncItemSchema = z.object({
  action: z.literal("hardware.quickPosSale.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(12).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

type SyncReceiptRow = {
  result: unknown;
  status: string;
};

type LeaseRow = {
  deviceId: string;
  endValue: number;
  expiresAt: Date;
  financialYear: string;
  format: string;
  id: string;
  nextValue: number;
  prefix: string;
  series: string;
  startValue: number;
};

export type OfflineQuickPosSyncSuccess = {
  documentId: string;
  documentNumber: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  paymentStatus: string;
  totalCents: number;
};

export class OfflineQuickPosSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(
    device: AuthenticatedOfflineDevice,
    rawItem: unknown,
  ): Promise<OfflineQuickPosSyncSuccess> {
    const item = quickPosSyncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued counter sale belongs to a different tenant or user.");
    }
    enforceSalesPermission(device.permissions);

    const receipt = await this.findReceipt(device, item.id, item.idempotencyKey);
    if (receipt?.status === "SUCCESS") return parseStoredResult(receipt.result);
    if (receipt) {
      throw conflict("This counter sale already has a non-success sync receipt and requires review.");
    }

    const payload = quickPosPayloadSchema.parse(item.payload);
    const input = quickPosSaleSchema.parse({
      ...payload.input,
      idempotencyKey: item.idempotencyKey,
    });
    const [tradeLease, invoiceLease] = await Promise.all([
      this.getLease(device, payload.trade.leaseId, "HSO"),
      this.getLease(device, payload.invoice.leaseId, "MS/INV"),
    ]);
    validateReservedNumber(tradeLease, payload.trade.leaseValue, payload.trade.documentNumber);
    validateReservedNumber(invoiceLease, payload.invoice.leaseValue, payload.invoice.invoiceNumber);

    const existing = await this.findExistingSale(device, item.idempotencyKey);
    if (existing) {
      const result = resultFromExisting(existing);
      assertExpectedNumbers(result, payload.trade.documentNumber, payload.invoice.invoiceNumber);
      await this.advanceNumberPair(device, tradeLease, payload.trade.leaseValue, invoiceLease, payload.invoice.leaseValue);
      await this.saveSuccessReceipt(device, item, result);
      return result;
    }

    assertNextLeaseValue(tradeLease, payload.trade.leaseValue, "trade");
    assertNextLeaseValue(invoiceLease, payload.invoice.leaseValue, "invoice");

    const result = await runWithOfflineQuickPosNumbers({
      invoice: {
        financialYear: invoiceLease.financialYear,
        invoiceNumber: payload.invoice.invoiceNumber,
        prefix: invoiceLease.prefix,
        value: payload.invoice.leaseValue,
      },
      tenantId: device.tenantId,
      trade: {
        documentNumber: payload.trade.documentNumber,
        financialYear: tradeLease.financialYear,
        prefix: tradeLease.prefix,
        value: payload.trade.leaseValue,
      },
    }, () => new HardwareTradeService(this.prisma).postQuickPosSale(
      { tenantId: device.tenantId, userId: device.userId },
      input,
    ));

    assertExpectedNumbers(result, payload.trade.documentNumber, payload.invoice.invoiceNumber);
    await this.advanceNumberPair(device, tradeLease, payload.trade.leaseValue, invoiceLease, payload.invoice.leaseValue);
    await this.saveSuccessReceipt(device, item, result);
    return result;
  }

  private findExistingSale(device: AuthenticatedOfflineDevice, idempotencyKey: string) {
    return this.prisma.hardwareTradeDocument.findFirst({
      include: { billingInvoice: true },
      where: {
        metadata: { equals: idempotencyKey, path: ["idempotencyKey"] },
        tenantId: device.tenantId,
        type: "SALES_ORDER",
      },
    });
  }

  private async getLease(
    device: AuthenticatedOfflineDevice,
    leaseId: string,
    series: OfflineNumberSeries,
  ): Promise<OfflineNumberLease> {
    const rows = await this.prisma.$queryRaw<LeaseRow[]>`
      SELECT "id", "deviceId", "series", "format", "prefix", "financialYear",
             "startValue", "endValue", "nextValue", "expiresAt"
      FROM "OfflineDocumentLease"
      WHERE "id" = ${leaseId}
        AND "tenantId" = ${device.tenantId}
        AND "deviceId" = ${device.id}
        AND "series" = ${series}
        AND "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !isOfflineSeries(row.series) || (row.format !== "trade" && row.format !== "invoice")) {
      throw conflict("Reserved counter-sale number lease is invalid, expired, or revoked.");
    }
    return {
      deviceId: row.deviceId,
      endValue: row.endValue,
      expiresAt: row.expiresAt.toISOString(),
      financialYear: row.financialYear,
      format: row.format,
      id: row.id,
      nextValue: row.nextValue,
      prefix: row.prefix,
      series: row.series,
      startValue: row.startValue,
    };
  }

  private async advanceNumberPair(
    device: AuthenticatedOfflineDevice,
    tradeLease: OfflineNumberLease,
    tradeValue: number,
    invoiceLease: OfflineNumberLease,
    invoiceValue: number,
  ) {
    await this.advanceLease(device, tradeLease, tradeValue);
    await this.advanceLease(device, invoiceLease, invoiceValue);
  }

  private async advanceLease(
    device: AuthenticatedOfflineDevice,
    lease: OfflineNumberLease,
    value: number,
  ) {
    const nextValue = Math.max(lease.nextValue, value + 1);
    const updated = await this.prisma.$executeRaw`
      UPDATE "OfflineDocumentLease"
      SET "nextValue" = ${nextValue},
          "status" = CASE WHEN ${nextValue} > "endValue" THEN 'EXHAUSTED' ELSE "status" END,
          "exhaustedAt" = CASE WHEN ${nextValue} > "endValue" THEN COALESCE("exhaustedAt", NOW()) ELSE "exhaustedAt" END,
          "updatedAt" = NOW()
      WHERE "id" = ${lease.id}
        AND "tenantId" = ${device.tenantId}
        AND "deviceId" = ${device.id}
        AND "nextValue" <= ${value + 1}
    `;
    if (updated !== 1) throw conflict("Reserved counter-sale number lease changed during sync.");
  }

  private async findReceipt(
    device: AuthenticatedOfflineDevice,
    queueItemId: string,
    idempotencyKey: string,
  ) {
    const rows = await this.prisma.$queryRaw<SyncReceiptRow[]>`
      SELECT "result", "status"
      FROM "OfflineSyncReceipt"
      WHERE "tenantId" = ${device.tenantId}
        AND "deviceId" = ${device.id}
        AND ("queueItemId" = ${queueItemId} OR "idempotencyKey" = ${idempotencyKey})
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async saveSuccessReceipt(
    device: AuthenticatedOfflineDevice,
    item: Pick<QueuedMutation, "action" | "id" | "idempotencyKey">,
    result: OfflineQuickPosSyncSuccess,
  ) {
    const resultJson = JSON.stringify(result);
    await this.prisma.$executeRaw`
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
}

function resultFromExisting(existing: {
  billingInvoice: { invoiceNumber: string } | null;
  billingInvoiceId: string | null;
  documentNumber: string;
  id: string;
  paymentStatus: string;
  totalCents: number;
}): OfflineQuickPosSyncSuccess {
  return {
    documentId: existing.id,
    documentNumber: existing.documentNumber,
    invoiceId: existing.billingInvoiceId,
    invoiceNumber: existing.billingInvoice?.invoiceNumber ?? null,
    paymentStatus: existing.paymentStatus,
    totalCents: existing.totalCents,
  };
}

function assertExpectedNumbers(
  result: OfflineQuickPosSyncSuccess,
  documentNumber: string,
  invoiceNumber: string,
) {
  if (result.documentNumber !== documentNumber || result.invoiceNumber !== invoiceNumber) {
    throw conflict("Synced counter sale does not match its reserved trade and invoice numbers.");
  }
}

function validateReservedNumber(lease: OfflineNumberLease, value: number, formattedNumber: string) {
  if (value < lease.startValue || value > lease.endValue) {
    throw conflict("Reserved counter-sale number is outside its assigned lease range.");
  }
  if (formatOfflineNumber(lease, value) !== formattedNumber) {
    throw conflict("Reserved counter-sale number does not match its assigned lease.");
  }
}

function assertNextLeaseValue(lease: OfflineNumberLease, value: number, label: string) {
  if (value !== lease.nextValue) {
    throw conflict(
      value < lease.nextValue
        ? `This reserved ${label} number has already been consumed on the server.`
        : `Offline ${label} numbers must sync in their reserved order.`,
    );
  }
}

function enforceSalesPermission(permissions: string[]) {
  if (
    !permissions.includes("*") &&
    !permissions.includes("hardware.plugin.manage") &&
    !permissions.includes("hardware.sales.manage")
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "The enrolled device no longer has permission to sync counter sales.",
      status: 403,
    });
  }
}

function parseStoredResult(value: unknown): OfflineQuickPosSyncSuccess {
  const parsed = z.object({
    documentId: z.string(),
    documentNumber: z.string(),
    invoiceId: z.string().nullable(),
    invoiceNumber: z.string().nullable(),
    paymentStatus: z.string(),
    totalCents: z.number().int().nonnegative(),
  }).safeParse(value);
  if (!parsed.success) throw conflict("Stored counter-sale sync receipt is invalid.");
  return parsed.data;
}

function isOfflineSeries(value: string): value is OfflineNumberSeries {
  return ["HPE", "HPO", "HPR", "HSB", "HSO", "HSQ", "HSR", "MS/INV"].includes(value);
}

function conflict(message: string) {
  return new AppError({ code: "CONFLICT", message, status: 409 });
}
