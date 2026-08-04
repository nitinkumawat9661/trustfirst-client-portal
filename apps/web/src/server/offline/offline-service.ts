import {
  HardwareInventoryMovementType,
  type PrismaClient,
} from "@trustfirst/database";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  offlineSnapshotSchemaVersion,
  type OfflineDeviceEnrollment,
  type OfflineSnapshot,
  type OfflineSnapshotDocument,
  type OfflineSnapshotFinancialPosition,
  type OfflineSnapshotStock,
} from "../../lib/offline-data/types";
import { AppError } from "../domain/errors";
import { HardwareFinancialService, type PartyFinancialPosition } from "../hardware/financial-service";
import { HardwareService, stockForProduct } from "../hardware/hardware-service";
import { HardwareTradeService } from "../hardware/trade-service";
import { PermissionResolverService } from "../permissions/permission-service";
import { OfflineNumberLeaseService } from "./number-lease-service";

type OfflineActorContext = {
  tenantId: string;
  userId: string;
};

type OfflineDeviceRow = {
  createdAt: Date;
  deviceKey: string;
  id: string;
  label: string | null;
  tenantId: string;
  userId: string;
};

type EnrollInput = {
  deviceKey: string;
  label?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
};

const maxDeviceKeyLength = 160;
const maxDeviceLabelLength = 120;

export class OfflineService {
  private readonly permissions: PermissionResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
  }

  async enrollDevice(context: OfflineActorContext, input: EnrollInput): Promise<OfflineDeviceEnrollment> {
    await this.permissions.resolveForMembership(context.userId, context.tenantId);
    const deviceKey = normalizeDeviceKey(input.deviceKey);
    const label = normalizeLabel(input.label);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const id = randomUUID();
    const metadata = JSON.stringify(sanitizeDeviceMetadata(input.metadata));

    const rows = await this.prisma.$queryRaw<OfflineDeviceRow[]>`
      INSERT INTO "OfflineDevice" (
        "id", "tenantId", "userId", "deviceKey", "tokenHash", "label",
        "status", "lastSeenAt", "metadata", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${context.tenantId}, ${context.userId}, ${deviceKey}, ${tokenHash}, ${label},
        'ACTIVE', NOW(), ${metadata}::jsonb, NOW(), NOW()
      )
      ON CONFLICT ("tenantId", "userId", "deviceKey")
      DO UPDATE SET
        "tokenHash" = EXCLUDED."tokenHash",
        "label" = EXCLUDED."label",
        "status" = 'ACTIVE',
        "revokedAt" = NULL,
        "lastSeenAt" = NOW(),
        "metadata" = EXCLUDED."metadata",
        "updatedAt" = NOW()
      RETURNING "id", "tenantId", "userId", "deviceKey", "label", "createdAt"
    `;
    const device = rows[0];
    if (!device) {
      throw new AppError({ code: "INTERNAL_ERROR", message: "Offline device enrollment failed.", status: 500 });
    }

    return {
      deviceId: device.id,
      deviceKey: device.deviceKey,
      enrolledAt: device.createdAt.toISOString(),
      label: device.label,
      tenantId: device.tenantId,
      token,
      userId: device.userId,
    };
  }

  async snapshot(context: OfflineActorContext, deviceId?: string | null): Promise<OfflineSnapshot> {
    const resolved = await this.permissions.resolveForMembership(context.userId, context.tenantId);
    const permissions = resolved.permissions.map(String);
    const hardware = new HardwareService(this.prisma);
    const financial = new HardwareFinancialService(this.prisma);
    const trade = new HardwareTradeService(this.prisma);

    const canCatalog = allowed(permissions, "hardware.catalog.read");
    const canInventory = allowed(permissions, "hardware.inventory.read");
    const canSales = allowed(permissions, "hardware.sales.read");
    const canPurchases = allowed(permissions, "hardware.purchase.read");
    const canSettings = allowed(permissions, "hardware.settings.read");

    const [
      tenant,
      products,
      categories,
      brands,
      units,
      locations,
      movements,
      customers,
      suppliers,
      settings,
      sales,
      quotations,
      purchases,
    ] = await Promise.all([
      this.prisma.tenant.findFirst({ select: { id: true, name: true, slug: true }, where: { id: context.tenantId } }),
      canCatalog ? hardware.listProducts(context) : Promise.resolve([]),
      canCatalog ? hardware.listCategories(context) : Promise.resolve([]),
      canCatalog ? hardware.listBrands(context) : Promise.resolve([]),
      canCatalog ? hardware.listUnits(context) : Promise.resolve([]),
      canInventory ? hardware.listLocations(context) : Promise.resolve([]),
      canInventory
        ? this.prisma.hardwareInventoryMovement.findMany({
            orderBy: { occurredAt: "asc" },
            select: { locationId: true, productId: true, quantity: true, type: true },
            where: { tenantId: context.tenantId },
          })
        : Promise.resolve([]),
      canSales ? hardware.listParties(context, "customer") : Promise.resolve([]),
      canPurchases ? hardware.listParties(context, "supplier") : Promise.resolve([]),
      canSettings ? hardware.getSettings(context) : Promise.resolve(null),
      canSales ? trade.listSales(context) : Promise.resolve([]),
      canSales ? trade.listQuotations(context) : Promise.resolve([]),
      canPurchases ? trade.listPurchases(context) : Promise.resolve([]),
    ]);

    if (!tenant) {
      throw new AppError({ code: "NOT_FOUND", message: "Active tenant was not found.", status: 404 });
    }

    const [customerPositions, supplierPositions] = await Promise.all([
      canSales
        ? Promise.all(customers.map((party) => financial.partyPosition(context, "customer", party.id)))
        : Promise.resolve([]),
      canPurchases
        ? Promise.all(suppliers.map((party) => financial.partyPosition(context, "supplier", party.id)))
        : Promise.resolve([]),
    ]);

    const generatedAt = new Date().toISOString();
    let numberLeases: OfflineSnapshot["numberLeases"] = [];
    if (deviceId) {
      await this.markSnapshot(context, deviceId);
      numberLeases = await new OfflineNumberLeaseService(this.prisma).listForDevice(context, deviceId);
    }

    return {
      brands: brands.map((brand) => ({ id: brand.id, name: brand.name, slug: brand.slug })),
      categories: categories.map((category) => ({ id: category.id, name: category.name, slug: category.slug })),
      customers,
      documents: {
        purchases: purchases.map(toSnapshotDocument),
        quotations: quotations.map(toSnapshotDocument),
        sales: sales.map(toSnapshotDocument),
      },
      financialPositions: {
        customers: customerPositions.map(toSnapshotFinancialPosition),
        suppliers: supplierPositions.map(toSnapshotFinancialPosition),
      },
      generatedAt,
      locations: locations.map((location) => ({ code: location.code, id: location.id, name: location.name })),
      numberLeases,
      permissions,
      products: products.map((product) => ({
        barcode: product.barcode,
        brandName: product.brandName,
        categoryName: product.categoryName,
        currentStock: product.currentStock,
        gstRateBps: product.gstRateBps,
        hsnCode: product.hsnCode,
        id: product.id,
        lowStock: product.lowStock,
        lowStockThreshold: product.lowStockThreshold,
        name: product.name,
        purchaseCostCents: product.purchaseCostCents,
        salesDiscountBps: product.salesDiscountBps,
        salesPriceCents: product.salesPriceCents,
        sku: product.sku,
        stockSetupStatus: product.stockSetupStatus,
        unitCode: product.unitCode,
      })),
      schemaVersion: offlineSnapshotSchemaVersion,
      settings: settings ? {
        address: asRecord(settings.address),
        defaultGstMode: settings.defaultGstMode,
        defaultStockLocationId: settings.defaultStockLocationId,
        email: settings.email,
        financialYear: settings.financialYear,
        firmName: settings.firmName,
        gstin: settings.gstin,
        invoicePrefix: settings.invoicePrefix,
        phone: settings.phone,
        roundOffEnabled: settings.roundOffEnabled,
        termsFooter: settings.termsFooter,
      } : null,
      stock: aggregateStock(movements),
      suppliers,
      tenant,
      tenantId: context.tenantId,
      units: units.map((unit) => ({ code: unit.code, id: unit.id, name: unit.name, precision: unit.precision })),
      userId: context.userId,
    };
  }

  private async markSnapshot(context: OfflineActorContext, deviceId: string) {
    const updated = await this.prisma.$executeRaw`
      UPDATE "OfflineDevice"
      SET "lastSnapshotAt" = NOW(), "lastSeenAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${deviceId}
        AND "tenantId" = ${context.tenantId}
        AND "userId" = ${context.userId}
        AND "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
    `;
    if (updated !== 1) {
      throw new AppError({ code: "NOT_FOUND", message: "Enrolled offline device was not found.", status: 404 });
    }
  }
}

function normalizeDeviceKey(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxDeviceKeyLength || !/^[A-Za-z0-9._:-]+$/u.test(normalized)) {
    throw new AppError({ code: "VALIDATION_ERROR", message: "A valid offline device key is required.", status: 422 });
  }
  return normalized;
}

function normalizeLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxDeviceLabelLength);
}

function sanitizeDeviceMetadata(value: Record<string, unknown> | undefined) {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => ["platform", "standalone", "timezone"].includes(key))
      .map(([key, entry]) => [key, typeof entry === "string" || typeof entry === "boolean" ? entry : null]),
  );
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function allowed(permissions: string[], permission: string) {
  return permissions.includes("*") || permissions.includes("hardware.plugin.manage") || permissions.includes(permission);
}

function aggregateStock(
  movements: Array<{ locationId: string; productId: string; quantity: number; type: HardwareInventoryMovementType }>,
): OfflineSnapshotStock[] {
  const grouped = new Map<string, typeof movements>();
  for (const movement of movements) {
    const key = `${movement.productId}:${movement.locationId}`;
    const current = grouped.get(key) ?? [];
    current.push(movement);
    grouped.set(key, current);
  }
  return [...grouped.entries()].map(([key, rows]) => {
    const [productId = "", locationId = ""] = key.split(":");
    return { locationId, productId, quantity: stockForProduct(rows) };
  });
}

function toSnapshotDocument(document: {
  customerName: string | null;
  documentNumber: string;
  id: string;
  paymentStatus: string;
  status: string;
  supplierName: string | null;
  totalCents: number;
  type: string;
  updatedAt: Date;
}): OfflineSnapshotDocument {
  return {
    customerName: document.customerName,
    documentNumber: document.documentNumber,
    id: document.id,
    paymentStatus: document.paymentStatus,
    status: document.status,
    supplierName: document.supplierName,
    totalCents: document.totalCents,
    type: document.type,
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toSnapshotFinancialPosition(
  position: PartyFinancialPosition,
): OfflineSnapshotFinancialPosition {
  return {
    advanceBalanceCents: position.advanceBalanceCents,
    openItems: position.openItems.map((item) => ({
      documentNumber: item.documentNumber,
      dueCents: item.dueCents,
      hardwareDocumentId: item.hardwareDocumentId,
      invoiceId: item.invoiceId,
      invoiceNumber: item.invoiceNumber,
      occurredAt: item.occurredAt.toISOString(),
      originalCents: item.originalCents,
      paidCents: item.paidCents,
      sourceId: item.sourceId,
      targetTransactionId: item.targetTransactionId,
    })),
    partyId: position.partyId,
    partyName: position.partyName,
    refundableBalanceCents: position.refundableBalanceCents,
    totalOutstandingCents: position.totalOutstandingCents,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
