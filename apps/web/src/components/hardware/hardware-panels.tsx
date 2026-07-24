import { Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { Boxes, IndianRupee, PackageSearch, ReceiptText, Warehouse } from "lucide-react";
import type { HardwareOperationalDashboard, HardwareReportSummary, InventoryDashboard } from "@/server/hardware";
import type { HardwareProductSummary } from "@/server/hardware";
import { HardwareProductTable } from "./hardware-product-table";

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

export function HardwareOperationalDashboardCards({
  dashboard,
  reports,
}: {
  dashboard: HardwareOperationalDashboard;
  reports: HardwareReportSummary;
}) {
  const cards = [
    { icon: IndianRupee, label: "Today sales", value: money(dashboard.todaySalesCents) },
    { icon: ReceiptText, label: "Today purchases", value: money(dashboard.todayPurchasesCents) },
    { icon: IndianRupee, label: "Customer outstanding", value: money(reports.outstandingCustomersCents) },
    { icon: IndianRupee, label: "Supplier outstanding", value: money(reports.outstandingSuppliersCents) },
    { icon: PackageSearch, label: "Low stock", value: dashboard.lowStockProducts },
    { icon: Boxes, label: "Product count", value: dashboard.products },
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
  return <Card><CardContent className="pt-5"><HardwareProductTable products={products} /></CardContent></Card>;
}

export function HardwarePluginSummary() {
  return (
    <Card>
      <CardHeader><CardTitle>Hardware and sanitary operations</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {["Catalog", "Inventory ledger", "Purchase documents", "Sales and billing", "GST reporting", "A4 print"].map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item}>{item}</div>
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
