import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Boxes, CircleDollarSign, PackageSearch, ReceiptText, TrendingUp, Warehouse } from "lucide-react";
import { hardwareLabels, type HardwareOperationalDashboard, type HardwareProductSummary, type InventoryDashboard } from "@/server/hardware";

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

export function HardwareOperationalDashboardCards({ dashboard }: { dashboard: HardwareOperationalDashboard }) {
  const labels = hardwareLabels.en;
  const cards = [
    { icon: CircleDollarSign, label: labels.dashboardTodaySales, value: money(dashboard.todaySalesCents) },
    { icon: ReceiptText, label: labels.dashboardTodayPurchases, value: money(dashboard.todayPurchasesCents) },
    { icon: CircleDollarSign, label: labels.dashboardPendingPayments, value: money(dashboard.pendingPaymentsCents) },
    { icon: PackageSearch, label: labels.lowStock, value: dashboard.lowStockProducts },
    { icon: Warehouse, label: labels.dashboardStockValue, value: money(dashboard.stockValueCents) },
    { icon: TrendingUp, label: labels.dashboardTopProducts, value: dashboard.topProducts.length },
    { icon: ReceiptText, label: labels.dashboardRecentBills, value: dashboard.recentBills.length },
    { icon: Boxes, label: labels.dashboardRecentPurchases, value: dashboard.recentPurchases.length },
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

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountCents / 100);
}
