import { HardwareInventoryMovementType, type Prisma, type PrismaClient } from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions";
import { PrismaHardwareRepository } from "./hardware-repository";
import { hardwareErpPluginManifest } from "./plugin-manifest";
import type {
  HardwareBrandInput,
  HardwareCategoryInput,
  HardwareImportPreviewInput,
  HardwareLocationInput,
  HardwareMovementInput,
  HardwareProductInput,
  HardwareUnitInput,
} from "./schemas";
import type { HardwareCsvExportContract, HardwareImportPreview, HardwareProductSummary, InventoryDashboard } from "./types";

type ActorContext = { tenantId: string; userId: string };
type ProductRecord = Awaited<ReturnType<PrismaHardwareRepository["listProducts"]>>[number];
type MovementRecord = Awaited<ReturnType<PrismaHardwareRepository["allMovements"]>>[number];

export class HardwareService {
  private readonly permissions: PermissionResolverService;
  private readonly repository: PrismaHardwareRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
    this.repository = new PrismaHardwareRepository(prisma);
  }

  manifest() {
    return hardwareErpPluginManifest;
  }

  async listProducts(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    const products = await this.repository.listProducts(context.tenantId);
    const movements = await this.repository.allMovements(context.tenantId);
    return products.map((product) => toProductSummary(product, movements));
  }

  async createCategory(context: ActorContext, input: HardwareCategoryInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createCategory(stripUndefined({
      description: input.description,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      slug: slugify(input.name),
      tenantId: context.tenantId,
    }) as Prisma.HardwareProductCategoryUncheckedCreateInput);
  }

  async listCategories(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    return this.repository.listCategories(context.tenantId);
  }

  async createBrand(context: ActorContext, input: HardwareBrandInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createBrand({
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      slug: slugify(input.name),
      tenantId: context.tenantId,
    });
  }

  async listBrands(context: ActorContext) {
    await this.enforce(context, "hardware.catalog.read");
    return this.repository.listBrands(context.tenantId);
  }

  async createUnit(context: ActorContext, input: HardwareUnitInput) {
    await this.enforce(context, "hardware.catalog.manage");
    return this.repository.createUnit({
      code: input.code.toUpperCase(),
      name: input.name,
      precision: input.precision ?? 0,
      tenantId: context.tenantId,
    });
  }

  async createLocation(context: ActorContext, input: HardwareLocationInput) {
    await this.enforce(context, "hardware.inventory.manage");
    return this.repository.createLocation({
      address: (input.address ?? {}) as Prisma.InputJsonValue,
      code: input.code.toUpperCase(),
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      name: input.name,
      tenantId: context.tenantId,
    });
  }

  async listLocations(context: ActorContext) {
    await this.enforce(context, "hardware.inventory.read");
    return this.repository.listLocations(context.tenantId);
  }

  async createProduct(context: ActorContext, input: HardwareProductInput) {
    await this.enforce(context, "hardware.catalog.manage");
    if (await this.repository.findProductBySku(context.tenantId, input.sku)) {
      throw validation("Product SKU already exists for this tenant.");
    }
    await this.validateOptionalLinks(context.tenantId, input);
    return this.repository.createProduct({
      actorId: context.userId,
      data: stripUndefined({
        barcode: input.barcode,
        brandId: input.brandId,
        categoryId: input.categoryId,
        description: input.description,
        gstTaxConfig: (input.gstTaxConfig ?? {}) as Prisma.InputJsonValue,
        lowStockThreshold: input.lowStockThreshold ?? 0,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        name: input.name,
        purchaseCostCents: input.purchaseCostCents ?? 0,
        salesPriceCents: input.salesPriceCents ?? 0,
        sku: input.sku,
        tenantId: context.tenantId,
        unitId: input.unitId,
      }) as Prisma.HardwareProductUncheckedCreateInput,
    });
  }

  async recordMovement(context: ActorContext, input: HardwareMovementInput) {
    await this.enforce(context, "hardware.inventory.manage");
    const product = await this.repository.findProductById(context.tenantId, input.productId);
    if (!product) throw validation("Product was not found.");
    await this.validateMovementLinks(context.tenantId, input);
    const currentStock = stockForProduct(await this.repository.movementsForProduct(context.tenantId, input.productId));
    if (input.type === HardwareInventoryMovementType.STOCK_OUT && input.quantity > currentStock) {
      throw validation("Stock out quantity cannot exceed current stock.");
    }
    const nextStock =
      input.type === HardwareInventoryMovementType.STOCK_IN
        ? currentStock + input.quantity
        : input.type === HardwareInventoryMovementType.STOCK_OUT
          ? currentStock - input.quantity
          : input.quantity;
    return this.repository.recordMovement({
      actorId: context.userId,
      data: stripUndefined({
        customerId: input.customerId,
        locationId: input.locationId,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        notes: input.notes,
        occurredAt: input.occurredAt ?? new Date(),
        productId: input.productId,
        quantity: input.quantity,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        supplierId: input.supplierId,
        tenantId: context.tenantId,
        type: input.type,
        unitCostCents: input.unitCostCents,
        unitPriceCents: input.unitPriceCents,
      }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,
      lowStock: nextStock <= product.lowStockThreshold,
    });
  }

  async dashboard(context: ActorContext): Promise<InventoryDashboard> {
    await this.enforce(context, "hardware.inventory.read");
    const products = await this.repository.listProducts(context.tenantId);
    const movements = await this.repository.allMovements(context.tenantId);
    const summaries = products.map((product) => toProductSummary(product, movements));
    return {
      lowStockProducts: summaries.filter((product) => product.lowStock).length,
      products: products.length,
      stockIn: movements.filter((movement) => movement.type === HardwareInventoryMovementType.STOCK_IN).length,
      stockOut: movements.filter((movement) => movement.type === HardwareInventoryMovementType.STOCK_OUT).length,
      stockValueCents: summaries.reduce((total, product) => total + product.currentStock * product.purchaseCostCents, 0),
    };
  }

  async search(context: ActorContext, query: string) {
    await this.enforce(context, "hardware.catalog.read");
    const products = await this.repository.searchProducts(context.tenantId, query);
    const movements = await this.repository.allMovements(context.tenantId);
    return products.map((product) => toProductSummary(product, movements));
  }

  async importPreview(context: ActorContext, input: HardwareImportPreviewInput): Promise<HardwareImportPreview> {
    await this.enforce(context, "hardware.catalog.manage");
    const errors = input.rows.flatMap((row, index) => {
      const rowNumber = index + 1;
      if (!row.sku || !row.name) return [{ message: "SKU and name are required.", row: rowNumber }];
      return [];
    });
    return { errors, validRows: input.rows.length - errors.length };
  }

  async csvExport(context: ActorContext): Promise<HardwareCsvExportContract> {
    const products = await this.listProducts(context);
    return {
      columns: ["sku", "name", "barcode", "currentStock", "salesPriceCents", "purchaseCostCents"],
      filename: "hardware-products.csv",
      format: "csv",
      rows: products.map((product) => ({
        barcode: product.barcode ?? "",
        currentStock: String(product.currentStock),
        name: product.name,
        purchaseCostCents: String(product.purchaseCostCents),
        salesPriceCents: String(product.salesPriceCents),
        sku: product.sku,
      })),
    };
  }

  private async validateOptionalLinks(tenantId: string, input: HardwareProductInput) {
    if (input.categoryId) await this.assertExists("hardwareProductCategory", tenantId, input.categoryId, "Category was not found.");
    if (input.brandId) await this.assertExists("hardwareBrand", tenantId, input.brandId, "Brand was not found.");
    if (input.unitId) await this.assertExists("hardwareUnit", tenantId, input.unitId, "Unit was not found.");
  }

  private async validateMovementLinks(tenantId: string, input: HardwareMovementInput) {
    await this.assertExists("hardwareStockLocation", tenantId, input.locationId, "Stock location was not found.");
    if (input.supplierId) await this.assertClient(tenantId, input.supplierId, "Supplier link was not found.");
    if (input.customerId) await this.assertClient(tenantId, input.customerId, "Customer link was not found.");
  }

  private async assertClient(tenantId: string, id: string, message: string) {
    const record = await this.prisma.clientOrganization.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
  }

  private async assertExists(
    model: "hardwareProductCategory" | "hardwareBrand" | "hardwareUnit" | "hardwareStockLocation",
    tenantId: string,
    id: string,
    message: string,
  ) {
    const record =
      model === "hardwareProductCategory"
        ? await this.prisma.hardwareProductCategory.findFirst({ select: { id: true }, where: { id, tenantId } })
        : model === "hardwareBrand"
          ? await this.prisma.hardwareBrand.findFirst({ select: { id: true }, where: { id, tenantId } })
          : model === "hardwareUnit"
            ? await this.prisma.hardwareUnit.findFirst({ select: { id: true }, where: { id, tenantId } })
            : await this.prisma.hardwareStockLocation.findFirst({ select: { id: true }, where: { id, tenantId } });
    if (!record) throw validation(message);
  }

  private async enforce(context: ActorContext, permission: string) {
    await this.permissions.enforce({
      policy: { anyOf: [permission as `${string}.${string}.${string}`, "hardware.plugin.manage", "*"] },
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }
}

function toProductSummary(product: ProductRecord, movements: MovementRecord[]): HardwareProductSummary {
  const currentStock = stockForProduct(movements.filter((movement) => movement.productId === product.id));
  return {
    barcode: product.barcode,
    currentStock,
    id: product.id,
    lowStock: currentStock <= product.lowStockThreshold,
    lowStockThreshold: product.lowStockThreshold,
    name: product.name,
    purchaseCostCents: product.purchaseCostCents,
    salesPriceCents: product.salesPriceCents,
    sku: product.sku,
  };
}

export function stockForProduct(movements: Array<{ quantity: number; type: HardwareInventoryMovementType }>) {
  return movements.reduce((stock, movement) => {
    if (movement.type === HardwareInventoryMovementType.STOCK_IN) return stock + movement.quantity;
    if (movement.type === HardwareInventoryMovementType.STOCK_OUT) return stock - movement.quantity;
    return movement.quantity;
  }, 0);
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function validation(message: string) {
  return new AppError({ code: "VALIDATION_ERROR", message, status: 422 });
}
