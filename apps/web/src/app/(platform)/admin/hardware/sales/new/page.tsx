import { getPrisma } from "@trustfirst/database";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { OfflineQuickPosForm } from "@/components/hardware/offline-quick-pos-form";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService } from "@/server/hardware";
import styles from "./quick-pos-layout.module.css";

export const dynamic = "force-dynamic";

export default async function NewHardwareSalePage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };
  const [parties, products, locations, settings, brands, categories, units] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
    service.listLocations(context),
    service.getSettings(context),
    service.listBrands(context),
    service.listCategories(context),
    service.listUnits(context),
  ]);
  return (
    <div className={`${styles.quickPosPage} space-y-6`}>
      <HardwarePageHeader description="Search products by name, brand, category, SKU, model, size, or colour—even with spelling mistakes or words in a different order. Review price and stock, then post and print a professional A4 invoice." eyebrow="Sales" title="Quick POS bill" />
      <OfflineQuickPosForm
        brands={brands}
        categories={categories}
        customers={parties}
        cashierName={user.name ?? user.email ?? "Counter user"}
        defaultFirm={{
          address: formatAddress(settings?.address),
          email: settings?.email ?? null,
          firmName: settings?.firmName ?? "Mangalam Sanitary",
          gstin: settings?.gstin ?? null,
          phone: settings?.phone ?? null,
          tagline: "BATHWARE · PLUMBING · HARDWARE",
          termsFooter: settings?.termsFooter ?? "Goods once sold will be accepted for return only as per store policy.",
        }}
        locations={locations}
        productSearchStorageKey={`trustfirst:${user.activeTenantId ?? "public"}:${user.id}:hardware:product-search`}
        products={products}
        units={units}
      />
    </div>
  );
}

function formatAddress(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parts = Object.values(value).filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  return parts.length ? parts.join(", ") : null;
}
