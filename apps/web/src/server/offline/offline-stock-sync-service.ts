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
import { hardwareMovementSchema, type HardwareMovementInput } from "../hardware/schemas";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";

const stockPayloadSchema = z.object({
  expectedCurrentStock: z.number().int().nonnegative().optional(),
  input: z.record(z.string(), z.unknown()),
}).superRefine((value, context) => {
  const input = hardwareMovementSchema.safeParse(value.input);
  if (
    input.success
    && input.data.type === HardwareInventoryMovementType.ADJUSTMENT
    && value.expectedCurrentStock === undefined
  ) {
    context.addIssue({
      code: "custom",
      message: "Absolute offline stock adjustment requires the expected current stock.",
      path: ["expectedCurrentStock"],
    });
  }
});

const stockSyncItemSchema = z.object({
  action: z.literal("hardware.stockAdjustmentDraft.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(12).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

const storedStockResultSchema = z.object({
  currentStockBefore: z.number().int(),
  id: z.string(),
  locationName: z.string(),
  nextStock: z.number().int(),
  occurredAt: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().nonnegative(),
  type: z.nativeEnum(HardwareInventoryMovementType),
});

type SyncReceiptRow = { result: unknown; status: string };
type LockedProductRow = { id: string; lowStockThreshold: number; name: string };
type LocationRow = { id: string; name: string };

export type OfflineStockSyncSuccess = z.infer<typeof storedStockResultSchema>;

export class OfflineStockSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(
    device: AuthenticatedOfflineDevice,
    rawItem: unknown,
  ): Promise<OfflineStockSyncSuccess> {
    const item = stockSyncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued stock movement belongs to a different tenant or user.");
    }
    enforcePermission(device.permissions);
    const payload = stockPayloadSchema.parse(item.payload);
    const input = hardwareMovementSchema.parse(payload.input);

    return this.prisma.$transaction(async (tx) => {
      const receipt = await findReceipt(tx, device, item.id, item.idempotencyKey);
      if (receipt?.status === "SUCCESS") return parseStoredResult(receipt.result);
      if (receipt) {
        throw conflict("This stock movement already has a non-success sync receipt and requires review.");
      }

      const product = await lockProduct(tx, device.tenantId, input.productId);
      const location = await validateLinks(tx, device.tenantId, input);
      const movements = await tx.hardwareInventoryMovement.findMany({
        select: { quantity: true, type: true },
        where: { productId: input.productId, tenantId: device.tenantId },
      });
      const currentStock = stockForMovements(movements);
      assertStockContract(input, currentStock, payload.expectedCurrentStock);
      const nextStock = nextStockForMovement(currentStock, input);
      const metadata = {
        ...asRecord(input.metadata),
        expectedCurrentStock: payload.expectedCurrentStock,
        offlineDeviceId: device.id,
        offlineIdempotencyKey: item.idempotencyKey,
        offlineSyncQueueItemId: item.id,
        offlineSyncedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue;
      const movement = await tx.hardwareInventoryMovement.create({
        data: compactRecord({
          customerId: input.customerId,
          locationId: input.locationId,
          metadata,
          notes: input.notes,
          occurredAt: input.occurredAt ?? new Date(),
          productId: input.productId,
          quantity: input.quantity,
          referenceId: input.referenceId ?? item.id,
          referenceType: input.referenceType ?? "offline_stock_sync",
          supplierId: input.supplierId,
          tenantId: device.tenantId,
          type: input.type,
          unitCostCents: input.unitCostCents,
          unitPriceCents: input.unitPriceCents,
        }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
      });
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: device.userId,
          metadata: { movementId: movement.id, quantity: movement.quantity },
          productId: movement.productId,
          summary: `${movement.type.toLowerCase().replaceAll("_", " ")} ${movement.quantity}`,
          tenantId: device.tenantId,
          verb: movementVerb(movement.type),
        },
      });
      if (nextStock <= product.lowStockThreshold) {
        await tx.hardwareTimelineEvent.create({
          data: {
            actorId: device.userId,
            productId: movement.productId,
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
          metadata: {
            currentStockBefore: currentStock,
            movementType: movement.type,
            nextStock,
            offlineDeviceId: device.id,
            offlineQueueItemId: item.id,
            quantity: movement.quantity,
          },
          targetId: movement.productId,
          targetType: "HardwareProduct",
          tenantId: device.tenantId,
        },
      });

      const result: OfflineStockSyncSuccess = {
        currentStockBefore: currentStock,
        id: movement.id,
        locationName: location.name,
        nextStock,
        occurredAt: movement.occurredAt.toISOString(),
        productId: movement.productId,
        productName: product.name,
        quantity: movement.quantity,
        type: movement.type,
      };
      await saveSuccessReceipt(tx, device, item, result);
      return result;
    });
  }
}

async function lockProduct(
  tx: Prisma.TransactionClient,
  tenantId: string,
  productId: string,
) {
  const rows = await tx.$queryRaw<LockedProductRow[]>`
    SELECT "id", "name", "lowStockThreshold"
    FROM "HardwareProduct"
    WHERE "id" = ${productId}
      AND "tenantId" = ${tenantId}
      AND "archivedAt" IS NULL
    FOR UPDATE
  `;
  if (!rows[0]) throw validation("Product was not found.");
  return rows[0];
}

async function validateLinks(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: HardwareMovementInput,
) {
  const locations = await tx.$queryRaw<LocationRow[]>`
    SELECT "id", "name"
    FROM "HardwareStockLocation"
    WHERE "id" = ${input.locationId}
      AND "tenantId" = ${tenantId}
    LIMIT 1
  `;
  if (!locations[0]) throw validation("Stock location was not found.");
  if (input.customerId) await ensureParty(tx, tenantId, input.customerId, "customer");
  if (input.supplierId) await ensureParty(tx, tenantId, input.supplierId, "supplier");
  return locations[0];
}

async function ensureParty(
  tx: Prisma.TransactionClient,
  tenantId: string,
  partyId: string,
  role: "customer" | "supplier",
) {
  const party = await tx.clientOrganization.findFirst({
    select: { customFields: true },
    where: { archivedAt: null, deletedAt: null, id: partyId, tenantId },
  });
  const fields = asRecord(party?.customFields);
  const roles = Array.isArray(fields.hardwarePartyRoles)
    ? fields.hardwarePartyRoles.filter((value): value is string => typeof value === "string")
    : [];
  if (!party || (!roles.includes(role) && fields.hardwarePartyRole !== role)) {
    throw validation(`${role === "customer" ? "Customer" : "Supplier"} link was not found or has the wrong role.`);
  }
}

function assertStockContract(
  input: HardwareMovementInput,
  currentStock: number,
  expectedCurrentStock: number | undefined,
) {
  if (
    input.type === HardwareInventoryMovementType.ADJUSTMENT
    && expectedCurrentStock !== currentStock
  ) {
    throw conflict(
      `Stock changed from ${expectedCurrentStock ?? "unknown"} to ${currentStock} before this offline adjustment synced. Review it manually.`,
    );
  }
  if (
    input.type === HardwareInventoryMovementType.STOCK_OUT
    && input.quantity > currentStock
  ) {
    throw conflict(`Stock out quantity ${input.quantity} exceeds the current server stock ${currentStock}.`);
  }
}

function nextStockForMovement(currentStock: number, input: HardwareMovementInput) {
  if (input.type === HardwareInventoryMovementType.STOCK_IN) return currentStock + input.quantity;
  if (input.type === HardwareInventoryMovementType.STOCK_OUT) return currentStock - input.quantity;
  return input.quantity;
}

function stockForMovements(
  movements: Array<{ quantity: number; type: HardwareInventoryMovementType }>,
) {
  return movements.reduce((stock, movement) => {
    if (movement.type === HardwareInventoryMovementType.STOCK_IN) return stock + movement.quantity;
    if (movement.type === HardwareInventoryMovementType.STOCK_OUT) return stock - movement.quantity;
    return movement.quantity;
  }, 0);
}

function movementVerb(type: HardwareInventoryMovementType) {
  if (type === HardwareInventoryMovementType.STOCK_IN) return HardwareTimelineVerb.STOCK_IN;
  if (type === HardwareInventoryMovementType.STOCK_OUT) return HardwareTimelineVerb.STOCK_OUT;
  return HardwareTimelineVerb.STOCK_ADJUSTED;
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
  result: OfflineStockSyncSuccess,
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

function enforcePermission(permissions: string[]) {
  if (
    !permissions.includes("*")
    && !permissions.includes("hardware.plugin.manage")
    && !permissions.includes("hardware.inventory.manage")
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "The enrolled device no longer has permission to sync stock movements.",
      status: 403,
    });
  }
}

function parseStoredResult(value: unknown): OfflineStockSyncSuccess {
  const parsed = storedStockResultSchema.safeParse(value);
  if (!parsed.success) throw conflict("Stored stock sync receipt is invalid.");
  return parsed.data;
}

function compactRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
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

export const offlineStockSyncTestUtils = {
  assertStockContract,
  nextStockForMovement,
  stockForMovements,
};
