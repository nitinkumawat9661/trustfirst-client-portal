import {
  HardwareTradeDocumentType,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { formatOfflineNumber, type OfflineNumberLease, type OfflineNumberSeries } from "../../lib/offline-data";
import type { QueuedMutation } from "../../lib/offline-queue";
import { AppError } from "../domain/errors";
import { calculateTradeTotals } from "../hardware/trade-calculations";
import { PrismaHardwareTradeRepository } from "../hardware/trade-repository";
import { hardwareTradeDocumentSchema, hardwareTradeStatusSchema, type HardwareTradeDocumentInput } from "../hardware/trade-schemas";
import { HardwareTradeService } from "../hardware/trade-service";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";

const supportedTradeTypes = [
  HardwareTradeDocumentType.PURCHASE_ENTRY,
  HardwareTradeDocumentType.PURCHASE_ORDER,
  HardwareTradeDocumentType.SALES_ORDER,
  HardwareTradeDocumentType.SALES_QUOTATION,
  HardwareTradeDocumentType.SUPPLIER_BILL,
] as const;

const tradeSyncPayloadSchema = z.object({
  confirm: z.boolean().default(true),
  documentNumber: z.string().trim().min(1).max(80),
  input: hardwareTradeDocumentSchema.refine(
    (input) => supportedTradeTypes.includes(input.type as (typeof supportedTradeTypes)[number]),
    "This hardware document type is not supported by offline trade sync yet.",
  ),
  leaseId: z.string().uuid(),
  leaseValue: z.number().int().positive(),
  locationId: z.string().uuid().nullable().optional(),
});

const syncItemSchema = z.object({
  action: z.literal("hardware.tradeDraft.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(1).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

type SyncReceiptRow = {
  action: string;
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

export type OfflineSyncSuccess = {
  documentId: string;
  documentNumber: string;
  status: string;
  totalCents: number;
};

export class OfflineSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(device: AuthenticatedOfflineDevice, rawItem: unknown): Promise<OfflineSyncSuccess> {
    const item = syncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued action belongs to a different tenant or user.");
    }

    const receipt = await this.findReceipt(device, item.id, item.idempotencyKey);
    if (receipt?.status === "SUCCESS") {
      return parseStoredResult(receipt.result);
    }
    if (receipt) {
      throw conflict("This queued action already has a non-success sync receipt and requires review.");
    }

    const payload = tradeSyncPayloadSchema.parse(item.payload);
    const series = seriesForType(payload.input.type);
    enforcePermission(device.permissions, payload.input.type);
    const lease = await this.getLease(device, payload.leaseId, series);
    validateReservedNumber(lease, payload.leaseValue, payload.documentNumber);

    const existing = await this.prisma.hardwareTradeDocument.findFirst({
      include: { customer: true, supplier: true },
      where: { documentNumber: payload.documentNumber, tenantId: device.tenantId },
    });
    if (existing) {
      const metadata = asRecord(existing.metadata);
      if (
        metadata.offlineSyncQueueItemId !== item.id ||
        metadata.offlineDeviceId !== device.id ||
        metadata.offlineIdempotencyKey !== item.idempotencyKey
      ) {
        throw conflict(`Document number ${payload.documentNumber} is already used by another record.`);
      }
      await this.advanceLease(device, lease, payload.leaseValue);
      const result = {
        documentId: existing.id,
        documentNumber: existing.documentNumber,
        status: existing.status,
        totalCents: existing.totalCents,
      };
      await this.saveSuccessReceipt(device, item, result);
      return result;
    }

    if (payload.leaseValue !== lease.nextValue) {
      throw conflict(
        payload.leaseValue < lease.nextValue
          ? "This reserved document number has already been consumed on the server."
          : "Offline documents must sync in their reserved number order.",
      );
    }

    const created = await this.createReservedTradeDocument(device, item, payload.input, payload.documentNumber, {
      leaseId: lease.id,
      leaseValue: payload.leaseValue,
    });
    let finalDocument = created;
    if (payload.confirm) {
      const statusInput = hardwareTradeStatusSchema.parse({ locationId: payload.locationId ?? undefined });
      finalDocument = await new HardwareTradeService(this.prisma).confirm(
        { tenantId: device.tenantId, userId: device.userId },
        created.id,
        statusInput,
      );
    }

    await this.advanceLease(device, lease, payload.leaseValue);
    const result = {
      documentId: finalDocument.id,
      documentNumber: finalDocument.documentNumber,
      status: finalDocument.status,
      totalCents: finalDocument.totalCents,
    };
    await this.saveSuccessReceipt(device, item, result);
    return result;
  }

  private async createReservedTradeDocument(
    device: AuthenticatedOfflineDevice,
    item: Pick<QueuedMutation, "id" | "idempotencyKey">,
    input: HardwareTradeDocumentInput,
    documentNumber: string,
    lease: { leaseId: string; leaseValue: number },
  ) {
    await validateLinks(this.prisma, device.tenantId, input);
    await assertUniqueSupplierReference(this.prisma, device.tenantId, input);
    const products = await this.prisma.hardwareProduct.findMany({
      where: { id: { in: input.items.map((line) => line.productId) }, tenantId: device.tenantId },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = input.items.map((line) => {
      const product = byId.get(line.productId);
      if (!product) throw validation("Product was not found while syncing the offline document.");
      return {
        ...line,
        taxRateBps: line.taxRateBps ?? taxRateFromConfig(product.gstTaxConfig),
      };
    });
    const totals = calculateTradeTotals(normalizedItems, input.roundOffCents ?? 0);
    const metadata = {
      ...asRecord(input.metadata),
      offlineDeviceId: device.id,
      offlineIdempotencyKey: item.idempotencyKey,
      offlineLeaseId: lease.leaseId,
      offlineLeaseValue: lease.leaseValue,
      offlineSyncQueueItemId: item.id,
      offlineSyncedAt: new Date().toISOString(),
    };

    return new PrismaHardwareTradeRepository(this.prisma).create({
      actorId: device.userId,
      data: stripUndefined({
        billingInvoiceId: input.billingInvoiceId,
        currency: input.currency ?? "INR",
        customerId: input.customerId,
        discountCents: totals.discountCents,
        documentNumber,
        metadata: metadata as Prisma.InputJsonValue,
        paymentStatus: input.billingInvoiceId ? "linked" : "unlinked",
        projectId: input.projectId,
        requirementId: input.requirementId,
        roundOffCents: totals.roundOffCents,
        subtotalCents: totals.subtotalCents,
        supplierId: input.supplierId,
        taxCents: totals.taxCents,
        tenantId: device.tenantId,
        totalCents: totals.totalCents,
        type: input.type,
      }) as Prisma.HardwareTradeDocumentUncheckedCreateInput,
      items: normalizedItems.map((line) => {
        const product = byId.get(line.productId);
        if (!product) throw validation("Product was not found while syncing the offline document.");
        const lineTotals = calculateTradeTotals([line]);
        const lineMetadata = asRecord(line.metadata);
        const productMetadata = asRecord(product.metadata);
        return {
          description: product.name,
          discountCents: line.discountCents ?? 0,
          lineTotalCents: lineTotals.totalCents,
          metadata: {
            ...lineMetadata,
            hsnCode: readString(lineMetadata.hsnCode) ?? readString(productMetadata.hsnCode),
          } as Prisma.InputJsonValue,
          productId: line.productId,
          quantity: line.quantity,
          taxCents: lineTotals.taxCents,
          taxRateBps: line.taxRateBps ?? 0,
          tenantId: device.tenantId,
          unitAmountCents: line.unitAmountCents,
        };
      }),
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
      throw conflict("Reserved document number lease is invalid, expired, or revoked.");
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

  private async advanceLease(device: AuthenticatedOfflineDevice, lease: OfflineNumberLease, value: number) {
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
    if (updated !== 1) throw conflict("Reserved document number lease changed during sync.");
  }

  private async findReceipt(
    device: AuthenticatedOfflineDevice,
    queueItemId: string,
    idempotencyKey: string,
  ) {
    const rows = await this.prisma.$queryRaw<SyncReceiptRow[]>`
      SELECT "action", "result", "status"
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
    result: OfflineSyncSuccess,
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

async function validateLinks(prisma: PrismaClient, tenantId: string, input: HardwareTradeDocumentInput) {
  if (input.customerId) await ensureParty(prisma, tenantId, input.customerId, "customer");
  if (input.supplierId) await ensureParty(prisma, tenantId, input.supplierId, "supplier");
  if (input.projectId) {
    const project = await prisma.project.findFirst({ select: { id: true }, where: { id: input.projectId, tenantId } });
    if (!project) throw validation("Project link was not found.");
  }
  if (input.requirementId) {
    const requirement = await prisma.requirement.findFirst({ select: { id: true }, where: { id: input.requirementId, tenantId } });
    if (!requirement) throw validation("Requirement link was not found.");
  }
  if (input.billingInvoiceId) {
    const invoice = await prisma.invoice.findFirst({ select: { id: true }, where: { id: input.billingInvoiceId, tenantId } });
    if (!invoice) throw validation("Billing invoice link was not found.");
  }
}

async function ensureParty(
  prisma: PrismaClient,
  tenantId: string,
  id: string,
  role: "customer" | "supplier",
) {
  const party = await prisma.clientOrganization.findFirst({
    select: { customFields: true },
    where: { archivedAt: null, deletedAt: null, id, tenantId },
  });
  const customFields = asRecord(party?.customFields);
  const roles = Array.isArray(customFields.hardwarePartyRoles)
    ? customFields.hardwarePartyRoles.filter((value): value is string => typeof value === "string")
    : [];
  if (!party || (!roles.includes(role) && customFields.hardwarePartyRole !== role)) {
    throw validation(`${role === "customer" ? "Customer" : "Supplier"} link was not found or has the wrong role.`);
  }
}

async function assertUniqueSupplierReference(
  prisma: PrismaClient,
  tenantId: string,
  input: HardwareTradeDocumentInput,
) {
  if (
    !input.supplierId ||
    (input.type !== HardwareTradeDocumentType.PURCHASE_ENTRY && input.type !== HardwareTradeDocumentType.SUPPLIER_BILL)
  ) return;
  const referenceNumber = readString(asRecord(input.metadata).referenceNumber);
  if (!referenceNumber) return;
  const duplicate = await prisma.hardwareTradeDocument.findFirst({
    select: { documentNumber: true },
    where: {
      metadata: { equals: referenceNumber, path: ["referenceNumber"] },
      supplierId: input.supplierId,
      tenantId,
      type: { in: [HardwareTradeDocumentType.PURCHASE_ENTRY, HardwareTradeDocumentType.SUPPLIER_BILL] },
    },
  });
  if (duplicate) throw conflict(`Supplier invoice/reference already exists on ${duplicate.documentNumber}.`);
}

function validateReservedNumber(lease: OfflineNumberLease, value: number, documentNumber: string) {
  if (value < lease.startValue || value > lease.endValue) {
    throw conflict("Reserved document number is outside the device lease range.");
  }
  if (formatOfflineNumber(lease, value) !== documentNumber) {
    throw conflict("Reserved document number does not match its server-issued lease.");
  }
}

function seriesForType(type: HardwareTradeDocumentType): OfflineNumberSeries {
  switch (type) {
    case HardwareTradeDocumentType.PURCHASE_ENTRY: return "HPE";
    case HardwareTradeDocumentType.PURCHASE_ORDER: return "HPO";
    case HardwareTradeDocumentType.SALES_ORDER: return "HSO";
    case HardwareTradeDocumentType.SALES_QUOTATION: return "HSQ";
    case HardwareTradeDocumentType.SUPPLIER_BILL: return "HSB";
    default: throw validation("This hardware document type is not supported by offline trade sync yet.");
  }
}

function enforcePermission(permissions: string[], type: HardwareTradeDocumentType) {
  const required = type === HardwareTradeDocumentType.SALES_ORDER || type === HardwareTradeDocumentType.SALES_QUOTATION
    ? "hardware.sales.manage"
    : "hardware.purchase.manage";
  if (!permissions.includes("*") && !permissions.includes("hardware.plugin.manage") && !permissions.includes(required)) {
    throw new AppError({ code: "FORBIDDEN", message: "Offline device no longer has permission for this action.", status: 403 });
  }
}

function taxRateFromConfig(value: unknown) {
  const config = asRecord(value);
  const rate = config.rateBps;
  if (rate === undefined) return 0;
  if (typeof rate !== "number" || !Number.isInteger(rate) || rate < 0 || rate > 10_000) {
    throw validation("GST rate must be between 0 and 10000 basis points.");
  }
  return rate;
}

function parseStoredResult(value: unknown): OfflineSyncSuccess {
  const result = z.object({
    documentId: z.string().min(1),
    documentNumber: z.string().min(1),
    status: z.string().min(1),
    totalCents: z.number().int(),
  }).safeParse(value);
  if (!result.success) throw new AppError({ code: "INTERNAL_ERROR", message: "Stored offline sync receipt is invalid.", status: 500 });
  return result.data;
}

function isOfflineSeries(value: string): value is OfflineNumberSeries {
  return ["HPE", "HPO", "HPR", "HSB", "HSO", "HSQ", "HSR", "MS/INV"].includes(value);
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

function conflict(message: string) {
  return new AppError({ code: "CONFLICT", message, status: 409 });
}
