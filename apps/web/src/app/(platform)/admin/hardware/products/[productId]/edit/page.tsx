import { getPrisma } from "@trustfirst/database";
import { notFound } from "next/navigation";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareProductForm } from "@/components/hardware/hardware-product-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, stockForProduct } from "@/server/hardware";

export const dynamic = "force-dynamic";

export default async function EditHardwareProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireCurrentUser();
  const prisma = getPrisma();
  const service = new HardwareService(prisma);
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const { productId } = await params;
  const [products, brands, categories, locations, movements, units] = await Promise.all([
    service.listProducts(context),
    service.listBrands(context),
    service.listCategories(context),
    service.listLocations(context),
    prisma.hardwareInventoryMovement.findMany({
      select: { locationId: true, quantity: true, type: true },
      where: { productId, tenantId: context.tenantId },
    }),
    service.listUnits(context),
  ]);
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Update product name, pricing, tax, HSN, barcode, category, brand, unit, or low-stock settings at any time."
        eyebrow="Catalog"
        title="Edit product"
      />
      <HardwareProductForm
        brands={brands}
        categories={categories}
        locations={locations.map((location) => ({
          currentStock: stockForProduct(movements.filter((movement) => movement.locationId === location.id)),
          id: location.id,
          name: location.name,
        }))}
        product={{
          barcode: product.barcode ?? "",
          brandId: brands.find((brand) => brand.name === product.brandName)?.id ?? "",
          categoryId: categories.find((category) => category.name === product.categoryName)?.id ?? "",
          gstRate: product.gstRateBps === null ? "" : String(product.gstRateBps / 100),
          hsnCode: product.hsnCode ?? "",
          id: product.id,
          lowStockThreshold: product.lowStockThreshold,
          name: product.name,
          purchasePrice: centsToInput(product.purchaseCostCents),
          salePrice: centsToInput(product.salesPriceCents),
          sku: product.sku,
          unitId: units.find((unit) => unit.code === product.unitCode)?.id ?? "",
        }}
        units={units}
      />
    </div>
  );
}

function centsToInput(value: number) {
  return (value / 100).toFixed(2);
}
