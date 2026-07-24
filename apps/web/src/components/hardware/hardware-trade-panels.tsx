import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { FileText, RotateCcw } from "lucide-react";
import type { HardwareReportSummary, HardwareTradeSummary } from "@/server/hardware";
import { HardwareDocumentActions } from "./hardware-document-actions";

export function HardwareTradeList({
  documents,
  emptyMessage,
  locations,
  title,
}: {
  documents: HardwareTradeSummary[];
  emptyMessage: string;
  locations: Array<{ id: string; name: string }>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          documents.map((document) => (
            <div className="rounded-md border border-border p-4" key={document.id}>
              <div className="flex flex-wrap items-center gap-2">
                <FileText aria-hidden className="size-4 text-muted-foreground" />
                <p className="font-medium">{document.documentNumber}</p>
                <Badge>{document.type.toLowerCase().replaceAll("_", " ")}</Badge>
                <Badge>{document.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {document.customerName ?? document.supplierName ?? "Party not linked"} · {formatDate(document.createdAt)} · Total {formatMoney(document.totalCents)} · Payment {document.paymentStatus}
              </p>
              <HardwareDocumentActions document={document} locations={locations} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function HardwareReportsPanel({ reports }: { reports: HardwareReportSummary }) {
  const cards = [
    { label: "Daily sales", value: formatMoney(reports.dailySalesCents) },
    { label: "Purchase summary", value: formatMoney(reports.purchaseSummaryCents) },
    { label: "Stock movement", value: reports.stockMovements },
    { label: "Low stock", value: reports.lowStockProducts },
    { label: "Outstanding customers", value: formatMoney(reports.outstandingCustomersCents) },
    { label: "Outstanding suppliers", value: formatMoney(reports.outstandingSuppliersCents) },
    { label: "Sales GST", value: formatMoney(reports.salesGstCents) },
    { label: "Purchase GST", value: formatMoney(reports.purchaseGstCents) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </div>
            <RotateCcw aria-hidden className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
