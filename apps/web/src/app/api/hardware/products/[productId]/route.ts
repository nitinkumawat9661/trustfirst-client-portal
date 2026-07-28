import {
  AuditAction,
  HardwareTimelineVerb,
  getPrisma,
  type Prisma,
} from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/domain/errors";
import { hardwareError, hardwareProductSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";
import { PermissionResolverService } from "@/server/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.activeTenantId ?? "public";
    const prisma = getPrisma();
    const permissions = new PermissionResolverService(prisma);
    await permissions.enforce({
      policy: { anyOf: ["hardware.catalog.manage", "hardware.plugin.manage", "*"] },
      tenantId,
      userId: user.id,
    });

    const { productId } = await params;
    const input = await parseHardwareJson(request, hardwareProductSchema);
    const existing = await prisma.hardwareProduct.findFirst({
      where: { archivedAt: null, id: productId, tenantId },
    });
    if (!existing) throw validation("Product was not found.");

    const sku = input.sku?.trim() || existing.sku;
    const barcode = input.barcode?.trim() || null;
    const brandId = input.brandId?.trim() || null;
    const categoryId = input.categoryId?.trim() || null;
    const unitId = input.unitId?.trim() || null;

    const duplicateSku = await prisma.hardwareProduct.findFirst({
      select: { id: true },
      where: { archivedAt: null, id: { not: productId }, sku, tenantId },
    });
    if (duplicateSku) throw validation("Product SKU already exists for this tenant.");

    if (barcode) {
      const duplicateBarcode = await prisma.hardwareProduct.findFirst({
        select: { id: true },
        where: { archivedAt: null, barcode, id: { not: productId }, tenantId },
      });
      if (duplicateBarcode) throw validation("Product barcode already exists for this tenant.");
    }

    await Promise.all([
      assertOptionalRecord(prisma, "brand", tenantId, brandId),
      assertOptionalRecord(prisma, "category", tenantId, categoryId),
      assertOptionalRecord(prisma, "unit", tenantId, unitId),
    ]);

    const metadata = {
      ...asRecord(existing.metadata),
      ...asRecord(input.metadata),
    } as Prisma.InputJsonValue;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.hardwareProduct.update({
        data: {
          barcode,
          brandId,
          categoryId,
          description: input.description ?? existing.description,
          gstTaxConfig: (input.gstTaxConfig ?? existing.gstTaxConfig) as Prisma.InputJsonValue,
          lowStockThreshold: input.lowStockThreshold ?? existing.lowStockThreshold,
          metadata,
          name: input.name.trim(),
          purchaseCostCents: input.purchaseCostCents ?? existing.purchaseCostCents,
          salesPriceCents: input.salesPriceCents,
          sku,
          unitId,
        },
        where: { id: productId },
      });
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: user.id,
          productId: updated.id,
          summary: `Updated product ${updated.sku}`,
          tenantId,
          verb: HardwareTimelineVerb.PRODUCT_UPDATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_CATALOG_UPDATED,
          actorId: user.id,
          metadata: { editableFields: ["name", "sku", "barcode", "brand", "category", "unit", "hsn", "gst", "purchasePrice", "salePrice", "lowStockThreshold"] },
          targetId: updated.id,
          targetType: "HardwareProduct",
          tenantId,
        },
      });
      return updated;
    });

    return hardwareResponse(product);
  } catch (error) {
    return hardwareError(error);
  }
}

async function assertOptionalRecord(
  prisma: ReturnType<typeof getPrisma>,
  type: "brand" | "category" | "unit",
  tenantId: string,
  id: string | null,
) {
  if (!id) return;
  const record = type === "brand"
    ? await prisma.hardwareBrand.findFirst({ select: { id: true }, where: { id, tenantId } })
    : type === "category"
      ? await prisma.hardwareProductCategory.findFirst({ select: { id: true }, where: { id, tenantId } })
      : await prisma.hardwareUnit.findFirst({ select: { id: true }, where: { id, tenantId } });
  if (!record) throw validation(`${type[0]?.toUpperCase()}${type.slice(1)} was not found.`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
