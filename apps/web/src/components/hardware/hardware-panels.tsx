import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Boxes, PackageSearch, Warehouse } from "lucide-react";
import type { HardwareProductSummary, InventoryDashboard } from "@/server/hardware";

export function InventoryCards({ dashboard }: { dashboard: InventoryDashboard }) {
  const cards = [
    { icon: Boxes, label: "Products", value: dashboard.products },
    { icon: Warehouse, label: "Stock In", value: dashboard.stockIn },
    { icon: Warehouse, label: "Stock Out", value: dashboard.stockOut },
    { icon: PackageSearch, label: "Low Stock", value: dashboard.lowStockProducts },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </div>
            <card.icon aria-hidden className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProductList({ products }: { products: HardwareProductSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            No hardware products are available yet.
          </div>
        ) : (
          products.map((product) => (
            <div className="rounded-md border border-border p-4" key={product.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{product.name}</p>
                <Badge>{product.sku}</Badge>
                {product.lowStock ? <Badge>low stock</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Stock {product.currentStock} · Barcode {product.barcode ?? "not set"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function HardwarePluginSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hardware & Sanitary ERP plugin</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {["Catalog", "Inventory Ledger", "Import Preview", "CSV Export", "GST Contract", "Low Stock Alerts"].map((item) => (
          <div className="rounded-md border border-border p-4 text-sm" key={item}>
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
