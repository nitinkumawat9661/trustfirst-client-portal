import {
  AuditAction,
  HardwareInventoryMovementType,
  HardwareTimelineVerb,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";

const productInclude = {
  brand: { select: { name: true } },
  category: { select: { name: true } },
  unit: { select: { code: true } },
};

export class PrismaHardwareRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listProducts(tenantId: string) {
    return this.prisma.hardwareProduct.findMany({
      include: productInclude,
      orderBy: { updatedAt: "desc" },
      where: { archivedAt: null, tenantId },
    });
  }

  findProductById(tenantId: string, id: string) {
    return this.prisma.hardwareProduct.findFirst({ include: productInclude, where: { id, tenantId } });
  }

  findProductBySku(tenantId: string, sku: string) {
    return this.prisma.hardwareProduct.findFirst({ include: productInclude, where: { sku, tenantId } });
  }

  findProductByBarcode(tenantId: string, barcode: string) {
    return this.prisma.hardwareProduct.findFirst({ include: productInclude, where: { barcode, tenantId } });
  }

  findProductByExactName(tenantId: string, name: string) {
    return this.prisma.hardwareProduct.findFirst({
      include: productInclude,
      where: { archivedAt: null, name: { equals: name.trim(), mode: "insensitive" }, tenantId },
    });
  }

  getSettings(tenantId: string) {
    return this.prisma.hardwareBusinessSettings.findUnique({ where: { tenantId } });
  }

  upsertSettings(input: Prisma.HardwareBusinessSettingsUncheckedCreateInput) {
    return this.prisma.hardwareBusinessSettings.upsert({
      create: input,
      update: stripUndefined({
        address: input.address,
        defaultGstMode: input.defaultGstMode,
        defaultStockLocationId: input.defaultStockLocationId,
        email: input.email,
        financialYear: input.financialYear,
        firmName: input.firmName,
        gstin: input.gstin,
        invoicePrefix: input.invoicePrefix,
        logoPlaceholder: input.logoPlaceholder,
        phone: input.phone,
        roundOffEnabled: input.roundOffEnabled,
        termsFooter: input.termsFooter,
      }) as Prisma.HardwareBusinessSettingsUncheckedUpdateInput,
      where: { tenantId: input.tenantId },
    });
  }

  createCategory(data: Prisma.HardwareProductCategoryUncheckedCreateInput) {
    return this.prisma.hardwareProductCategory.create({ data });
  }

  listCategories(tenantId: string) {
    return this.prisma.hardwareProductCategory.findMany({ orderBy: { name: "asc" }, where: { tenantId } });
  }

  createBrand(data: Prisma.HardwareBrandUncheckedCreateInput) {
    return this.prisma.hardwareBrand.create({ data });
  }

  listBrands(tenantId: string) {
    return this.prisma.hardwareBrand.findMany({ orderBy: { name: "asc" }, where: { tenantId } });
  }

  createUnit(data: Prisma.HardwareUnitUncheckedCreateInput) {
    return this.prisma.hardwareUnit.create({ data });
  }

  listUnits(tenantId: string) {
    return this.prisma.hardwareUnit.findMany({ orderBy: { name: "asc" }, where: { tenantId } });
  }

  createLocation(data: Prisma.HardwareStockLocationUncheckedCreateInput) {
    return this.prisma.hardwareStockLocation.create({ data });
  }

  listLocations(tenantId: string) {
    return this.prisma.hardwareStockLocation.findMany({ orderBy: { name: "asc" }, where: { tenantId } });
  }

  createProduct(input: { actorId: string; data: Prisma.HardwareProductUncheckedCreateInput }) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.hardwareProduct.create({ data: input.data });
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: input.actorId,
          productId: product.id,
          summary: `Created product ${product.sku}`,
          tenantId: product.tenantId,
          verb: HardwareTimelineVerb.PRODUCT_CREATED,
        },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_CATALOG_UPDATED,
          actorId: input.actorId,
          targetId: product.id,
          targetType: "HardwareProduct",
          tenantId: product.tenantId,
        },
      });
      return product;
    });
  }

  recordMovement(input: {
    actorId: string;
    data: Prisma.HardwareInventoryMovementUncheckedCreateInput;
    lowStock: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.hardwareInventoryMovement.create({ data: input.data });
      const verb = movementVerb(movement.type);
      await tx.hardwareTimelineEvent.create({
        data: {
          actorId: input.actorId,
          metadata: { movementId: movement.id, quantity: movement.quantity },
          productId: movement.productId,
          summary: `${movement.type.toLowerCase().replaceAll("_", " ")} ${movement.quantity}`,
          tenantId: movement.tenantId,
          verb,
        },
      });
      if (input.lowStock) {
        await tx.hardwareTimelineEvent.create({
          data: {
            actorId: input.actorId,
            productId: movement.productId,
            summary: "Low stock threshold reached",
            tenantId: movement.tenantId,
            verb: HardwareTimelineVerb.LOW_STOCK_ALERTED,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          action: AuditAction.HARDWARE_STOCK_MOVED,
          actorId: input.actorId,
          metadata: { movementType: movement.type, quantity: movement.quantity },
          targetId: movement.productId,
          targetType: "HardwareProduct",
          tenantId: movement.tenantId,
        },
      });
      return movement;
    });
  }

  movementsForProduct(tenantId: string, productId: string) {
    return this.prisma.hardwareInventoryMovement.findMany({
      where: { productId, tenantId },
    });
  }

  allMovements(tenantId: string) {
    return this.prisma.hardwareInventoryMovement.findMany({
      include: {
        location: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      where: { tenantId },
    });
  }

  searchProducts(tenantId: string, query: string) {
    return this.prisma.hardwareProduct.findMany({
      include: productInclude,
      orderBy: { updatedAt: "desc" },
      take: 25,
      where: {
        archivedAt: null,
        tenantId,
        OR: [
          { sku: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
        ],
      },
    });
  }
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function movementVerb(type: HardwareInventoryMovementType) {
  if (type === HardwareInventoryMovementType.STOCK_IN) return HardwareTimelineVerb.STOCK_IN;
  if (type === HardwareInventoryMovementType.STOCK_OUT) return HardwareTimelineVerb.STOCK_OUT;
  return HardwareTimelineVerb.STOCK_ADJUSTED;
}
