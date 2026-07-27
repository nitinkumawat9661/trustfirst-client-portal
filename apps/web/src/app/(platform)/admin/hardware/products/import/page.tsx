import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { HardwareProductImportPanel } from "@/components/hardware/hardware-product-import-panel";

export const dynamic = "force-dynamic";

export default function HardwareProductImportPage() {
  return (
    <div className="space-y-6">
      <HardwarePageHeader description="Preview, validate, and import product master rows with auditable opening-stock movements." eyebrow="Catalog" title="Import products" />
      <HardwareProductImportPanel />
    </div>
  );
}
