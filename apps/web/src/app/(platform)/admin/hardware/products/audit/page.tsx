import { getPrisma } from "@trustfirst/database";
import { Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import Link from "next/link";
import { HardwarePageHeader } from "@/components/hardware/hardware-page-header";
import { requireCurrentUser } from "@/server/auth/session";
import { HardwareService, type HardwareProductSummary } from "@/server/hardware";

export const dynamic = "force-dynamic";

type DuplicateGroup = {
  differentRates: boolean;
  key: string;
  products: HardwareProductSummary[];
};

export default async function HardwareProductAuditPage() {
  const user = await requireCurrentUser();
  const service = new HardwareService(getPrisma());
  const products = await service.listProducts({ tenantId: user.activeTenantId ?? "public", userId: user.id });
  const duplicateGroups = buildDuplicateGroups(products);
  const duplicateRows = duplicateGroups.reduce((total, group) => total + group.products.length, 0);
  const differentRateGroups = duplicateGroups.filter((group) => group.differentRates).length;
  const missingBarcode = products.filter((product) => !product.barcode).length;
  const missingHsn = products.filter((product) => !product.hsnCode).length;

  return (
    <div className="space-y-6">
      <HardwarePageHeader
        description="Review same-name products, different-rate variants, and missing catalogue identifiers. This report never deletes, merges, or changes products."
        eyebrow="Catalog audit"
        title="Product quality report"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Products" value={products.length} />
        <Metric label="Same-name groups" value={duplicateGroups.length} />
        <Metric label="Rows in those groups" value={duplicateRows} />
        <Metric label="Groups with different rates" value={differentRateGroups} />
        <Metric label="Missing barcode / HSN" value={`${missingBarcode} / ${missingHsn}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Same-name products</CardTitle>
          <p className="text-sm text-muted-foreground">Use SKU, brand, category, rate, and stock to verify each variant. Open a product only when its display name needs correction.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {duplicateGroups.map((group) => (
            <section className="overflow-hidden rounded-md border border-border" key={group.key}>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted px-3 py-2">
                <h2 className="font-semibold">{group.products[0]?.name}</h2>
                <span className="text-xs text-muted-foreground">{group.products.length} variants{group.differentRates ? " • different rates" : ""}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr><th className="px-3 py-2">SKU</th><th>Brand</th><th>Category</th><th className="text-right">Sale rate</th><th className="text-right">Stock</th><th className="px-3 text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => (
                      <tr className="border-b border-border last:border-0" key={product.id}>
                        <td className="px-3 py-2 font-medium">{product.sku}</td>
                        <td>{product.brandName ?? "-"}</td>
                        <td>{product.categoryName ?? "-"}</td>
                        <td className="text-right">{money(product.salesPriceCents)}</td>
                        <td className="text-right">{product.currentStock} {product.unitCode ?? "PCS"}</td>
                        <td className="px-3 text-right"><Link className="font-medium text-primary hover:underline" href={`/admin/hardware/products/${product.id}/edit`}>Edit</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {!duplicateGroups.length ? <p className="text-sm text-muted-foreground">No exact same-name groups found.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>;
}

function buildDuplicateGroups(products: HardwareProductSummary[]): DuplicateGroup[] {
  const grouped = new Map<string, HardwareProductSummary[]>();
  for (const product of products) {
    const key = normalize(product.name);
    const existing = grouped.get(key) ?? [];
    existing.push(product);
    grouped.set(key, existing);
  }
  return [...grouped.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({
      differentRates: new Set(entries.map((product) => product.salesPriceCents)).size > 1,
      key,
      products: entries.sort((left, right) => left.salesPriceCents - right.salesPriceCents || left.sku.localeCompare(right.sku)),
    }))
    .sort((left, right) => Number(right.differentRates) - Number(left.differentRates) || right.products.length - left.products.length || left.key.localeCompare(right.key));
}

function normalize(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").toLowerCase();
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}
