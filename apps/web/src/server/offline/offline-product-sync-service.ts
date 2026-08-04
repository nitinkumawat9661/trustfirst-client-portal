import {
  AuditAction,
  HardwareInventoryMovementType,
  HardwareTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { QueuedMutation } from "../../lib/offline-queue";
import { AppError } from "../domain/errors";
import { quickHardwareProductSchema, type QuickHardwareProductInput } from "../hardware/schemas";
import type { HardwareProductSummary } from "../hardware/types";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";

const productPayloadSchema = z.object({
  input: z.record(z.string(), z.unknown()),
});

const productSyncItemSchema = z.object({
  action: z.literal("hardware.productDraft.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(12).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

const storedProductResultSchema = z.object({
  barcode: z.string().nullable(),
  brandName: z.string().nullable(),
  categoryName: z.string().nullable(),
  currentStock: z.number().int(),
  gstRateBps: z.number().int().nullable(),
  hsnCode: z.string().nullable(),
  id: z.string(),
  lowStock: z.boolean(),
  lowStockThreshold: z.number().int(),
  name: z.string(),
  purchaseCostCents: z.number().int(),
  salesDiscountBps: z.number().int(),
  salesPriceCents: z.number().int(),
  sku: z.string(),
  status: z.literal("ACTIVE"),
  stockSetupStatus: z.enum(["TRACKED", "PENDING"]),
  unitCode: z.string().nullable(),
});

type SyncReceiptRow = {
  result: unknown;
  status: string;
};

type ProductIdentity = {
  deviceId: string;
  idempotencyKey: string;
  queueItemId: string;
};

type ProductWithRelations = {
  barcode: string | null;
  brand: { name: string } | null;
  category: { name: string } | null;
  gstTaxConfig: unknown;
  id: string;
  lowStockThreshold: number;
  metadata: unknown;
  name: string;
  purchaseCostCents: number;
  salesPriceCents: number;
  sku: string;
  unit: { code: string } | null;
};

export class OfflineProductSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(
    device: AuthenticatedOfflineDevice,
    rawItem: unknown,
  ): Promise<HardwareProductSummary> {
    const item = productSyncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued product belongs to a different tenant or user.");
    }

    const payload = productPayloadSchema.parse(item.payload);
    const input = quickHardwareProductSchema.parse(payload.input);
    enforceProductPermissions(device.permissions, input);
    const identity: ProductIdentity = {
      deviceId: device.id,
      idempotencyKey: item.idempotencyKey,
      queueItemId: item.id,
    };

    return this.prisma.$transaction(async (tx) => {
      for (const lock of productLockKeys(device.tenantId, input)) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
      }

      const receipt = await findReceipt(tx, device, item.id, item.idempotencyKey);
      if (receipt?.status === "SUCCESS") return parseStoredResult(receipt.result);
      if (receipt) {
        throw conflict("This product already has a non-success sync receipt and requires review.");
      }

      await validateLinks(tx, device.tenantId, input);
      const duplicate = await findDuplicateProduct(tx, device.tenantId, input);
      if (duplicate) {
        const metadata = asRecord(duplicate.metadata);
        if (!matchesOfflineIdentity(metadata, identity)) {
          throw conflict("A server product with the same name, SKU, or barcode already exists. Review the offline conflict instead of merging it automatically.");
        }
        const movements = await tx.hardwareInventoryMovement.findMany({
          select: { quantity: true, type: true },
          where: { productId: duplicate.id, tenantId: device.tenantId },
        });
        const result = toProductSummary(duplicate, stockForMovements(movements));
        await saveSuccessReceipt(tx, device, item, result);
        return result;
      }

      const sku = input.sku?.trim() || await nextProductSku(tx, device.tenantId, input.name);
      if (await tx.hardwareProduct.findFirst({ select: { id: true }, where: { sku, tenantId: device.tenantId } })) {
        throw conflict("Product SKU was allocated by another record while this offline product was syncing.");
      }
      const unit = input.unitId
        ? await tx.hardwareUnit.findFirst({ where: { id: input.unitId, tenantId: device.tenantId } })
        : await tx.hardwareUnit.upsert({
            create: { code: "PCS", name: "Pieces", tenantId: device.tenantId },
            update: {},
            where: { tenantId_code: { code: "PCS", tenantId: device.tenantId } },
          });
      if (!unit) throw validation("Unit was not found.");

      const metadata = compactRecord({
        hsnCode: input.hsnCode,
        offlineDeviceId: identity.deviceId,
        offlineIdempotencyKey: identity.idempotencyKey,
        offlineSyncQueueItemId: identity.queueItemId,
        offlineSyncedAt: new Date().toISOString(),
        stockSetupPendingAt: input.openingStock ? undefined : new Date().toISOString(),
        stockSetupStatus: input.openingStock ? "TRACKED" : "PENDING",
      });
      const product = await tx.hardwareProduct.create({
        data: {
          barcode: input.barcode,
          brandId: input.brandId,
          categoryId: input.categoryId,
          gstTaxConfig: input.gstRateBps === undefined ? {} : { rateBps: input.gstRateBps },
          lowStockThreshold: input.lowStockThreshold ?? 0,
          metadata: metadata as Prisma.InputJsonValue,
          name: input.name,
          purchaseCostCents: input.purchaseCostCents ?? 0,
          salesPriceCents: input.salesPriceCents ?? 0,
          sku,
          tenantId: device.tenantId,
          unitId: unit.id,
        },
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          unit: { select: { code: true } },
        },
      });
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: device.userId,
          productId: product.id,
          summary: `Created product ${product.sku}`,
          tenantId: device.tenantId,
          verb: HardwareTimelineVerb.PRODUCT_CREATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_CATALOG_UPDATED,
          actorId: device.userId,
          metadata: { offlineDeviceId: device.id, offlineQueueItemId: item.id },
          targetId: product.id,
          targetType: "HardwareProduct",
          tenantId: device.tenantId,
        },
      });

      const openingQuantity = input.openingStock?.quantity ?? 0;
      if (input.openingStock && openingQuantity > 0) {
        const movement = await tx.hardwareInventoryMovement.create({
          data: {
            locationId: input.openingStock.locationId,
            metadata: {
              offlineDeviceId: device.id,
              offlineQueueItemId: item.id,
              stockSetup: "opening",
            },
            notes: "Opening stock setup",
            productId: product.id,
            quantity: openingQuantity,
            referenceId: item.id,
            referenceType: "stock_setup",
            tenantId: device.tenantId,
            type: HardwareInventoryMovementType.STOCK_IN,
            unitPriceCents: input.salesPriceCents,
          },
        });
        await tx.hardwareTimelineEvent.create({
          data: {
            actorId: device.userId,
            metadata: { movementId: movement.id, quantity: movement.quantity },
            productId: product.id,
            summary: `stock in ${movement.quantity}`,
            tenantId: device.tenantId,
            verb: HardwareTimelineVerb.STOCK_IN,
          },
        });
        if (openingQuantity <= product.lowStockThreshold) {
          await tx.hardwareTimelineEvent.create({
            data: {
              actorId: device.userId,
              productId: product.id,
              summary: "Low stock threshold reached",
              tenantId: device.tenantId,
              verb: HardwareTimelineVerb.LOW_STOCK_ALERTED,
            },
          });
        }
        await tx.auditEvent.create({
          data: {
            action: AuditAction.HARDWARE_STOCK_MOVED,
            actorId: device.userId,
            metadata: { movementType: HardwareInventoryMovementType.STOCK_IN, quantity: openingQuantity },
            targetId: product.id,
            targetType: "HardwareProduct",
            tenantId: device.tenantId,
          },
        });
      }

      const result = toProductSummary(product, openingQuantity);
      await saveSuccessReceipt(tx, device, item, result);
      return result;
    });
  }
}

async function validateLinks(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: QuickHardwareProductInput,
) {
  if (input.categoryId && !await tx.hardwareProductCategory.findFirst({ select: { id: true }, where: { id: input.categoryId, tenantId } })) {
    throw validation("Category was not found.");
  }
  if (input.brandId && !await tx.hardwareBrand.findFirst({ select: { id: true }, where: { id: input.brandId, tenantId } })) {
    throw validation("Brand was not found.");
  }
  if (input.unitId && !await tx.hardwareUnit.findFirst({ select: { id: true }, where: { id: input.unitId, tenantId } })) {
    throw validation("Unit was not found.");
  }
  if (input.openingStock && !await tx.hardwareStockLocation.findFirst({
    select: { id: true },
    where: { id: input.openingStock.locationId, tenantId },
  })) {
    throw validation("Stock location was not found.");
  }
}

async function findDuplicateProduct(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: QuickHardwareProductInput,
): Promise<ProductWithRelations | null> {
  return tx.hardwareProduct.findFirst({
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      unit: { select: { code: true } },
    },
    where: {
      tenantId,
      OR: [
        { archivedAt: null, name: { equals: input.name.trim(), mode: "insensitive" } },
        ...(input.sku ? [{ sku: input.sku.trim() }] : []),
        ...(input.barcode ? [{ barcode: input.barcode }] : []),
      ],
    },
  });
}

async function nextProductSku(
  tx: Prisma.TransactionClient,
  tenantId: string,
  name: string,
) {
  const base = productSkuBase(name);
  for (let sequence = 1; sequence <= 999_999; sequence += 1) {
    const candidate = `${base}-${sequence.toString().padStart(3, "0")}`;
    const existing = await tx.hardwareProduct.findFirst({ select: { id: true }, where: { sku: candidate, tenantId } });
    if (!existing) return candidate;
  }
  throw new AppError({ code: "INTERNAL_ERROR", message: "A unique product SKU could not be allocated.", status: 500 });
}

function productLockKeys(tenantId: string, input: QuickHardwareProductInput) {
  const skuKey = input.sku?.trim() || `AUTO:${productSkuBase(input.name)}`;
  return [
    `offline-product:${tenantId}:name:${normalizeComparable(input.name)}`,
    `offline-product:${tenantId}:sku:${skuKey}`,
    ...(input.barcode ? [`offline-product:${tenantId}:barcode:${input.barcode}`] : []),
  ].sort();
}

function productSkuBase(name: string) {
  return slugify(name).toUpperCase().replaceAll("-", "").slice(0, 12) || "ITEM";
}

function toProductSummary(product: ProductWithRelations, currentStock: number): HardwareProductSummary {
  const metadata = asRecord(product.metadata);
  const gstTaxConfig = asRecord(product.gstTaxConfig);
  return {
    barcode: product.barcode,
    brandName: product.brand?.name ?? null,
    categoryName: product.category?.name ?? null,
    currentStock,
    gstRateBps: readRateBps(gstTaxConfig.rateBps),
    hsnCode: readText(metadata.hsnCode),
    id: product.id,
    lowStock: currentStock <= product.lowStockThreshold,
    lowStockThreshold: product.lowStockThreshold,
    name: product.name,
    purchaseCostCents: product.purchaseCostCents,
    salesDiscountBps: 0,
    salesPriceCents: product.salesPriceCents,
    sku: product.sku,
    status: "ACTIVE",
    stockSetupStatus: metadata.stockSetupStatus === "PENDING" ? "PENDING" : "TRACKED",
    unitCode: product.unit?.code ?? null,
  };
}

function stockForMovements(movements: Array<{ quantity: number; type: HardwareInventoryMovementType }>) {
  return movements.reduce((stock, movement) => {
    if (movement.type === HardwareInventoryMovementType.STOCK_IN) return stock + movement.quantity;
    if (movement.type === HardwareInventoryMovementType.STOCK_OUT) return stock - movement.quantity;
    return movement.quantity;
  }, 0);
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
  result: HardwareProductSummary,
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

function enforceProductPermissions(permissions: string[], input: QuickHardwareProductInput) {
  enforcePermission(permissions, "hardware.catalog.manage", "The enrolled device no longer has permission to sync products.");
  if ((input.openingStock?.quantity ?? 0) > 0) {
    enforcePermission(permissions, "hardware.inventory.manage", "The enrolled device no longer has permission to sync opening stock.");
  }
}

function enforcePermission(permissions: string[], required: string, message: string) {
  if (
    !permissions.includes("*")
    && !permissions.includes("hardware.plugin.manage")
    && !permissions.includes(required)
  ) {
    throw new AppError({ code: "FORBIDDEN", message, status: 403 });
  }
}

function parseStoredResult(value: unknown): HardwareProductSummary {
  const parsed = storedProductResultSchema.safeParse(value);
  if (!parsed.success) throw conflict("Stored product sync receipt is invalid.");
  return parsed.data;
}

function matchesOfflineIdentity(metadata: Record<string, unknown>, identity: ProductIdentity) {
  return metadata.offlineDeviceId === identity.deviceId
    && metadata.offlineIdempotencyKey === identity.idempotencyKey
    && metadata.offlineSyncQueueItemId === identity.queueItemId;
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80);
}

function compactRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRateBps(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10_000
    ? value
    : null;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}

function conflict(message: string) {
  return new AppError({ code: "CONFLICT", message, status: 409 });
}

export const offlineProductSyncTestUtils = {
  matchesOfflineIdentity,
  normalizeComparable,
  productLockKeys,
  productSkuBase,
  stockForMovements,
};
