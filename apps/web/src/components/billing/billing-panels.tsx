import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import type { BillingDashboard, InvoiceSummary } from "@/server/billing";

export function BillingDashboardCards({ dashboard }: { dashboard: BillingDashboard }) {
  const cards = [
    { label: "Invoices", value: dashboard.totalInvoices },
    { label: "Drafts", value: dashboard.draftInvoices },
    { label: "Overdue", value: dashboard.overdueInvoices },
    { label: "Outstanding", value: formatMoney(dashboard.outstandingAmountCents) },
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
            <CreditCard aria-hidden className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InvoiceList({ hrefPrefix, invoices }: { hrefPrefix: string; invoices: InvoiceSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoices.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            No invoices are available yet.
          </div>
        ) : (
          invoices.map((invoice) => (
            <Link
              className="flex flex-col gap-2 rounded-md border border-border p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
              href={`${hrefPrefix}/${invoice.id}`}
              key={invoice.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden className="size-4 text-muted-foreground" />
                  <p className="font-medium">{invoice.title}</p>
                  <Badge>{invoice.status.toLowerCase().replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invoice.invoiceNumber} · Outstanding {formatMoney(invoice.outstandingAmountCents)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Due {invoice.dueAt?.toLocaleDateString() ?? "not set"}</p>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentsFoundationPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment providers</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {["Manual", "Razorpay", "Stripe", "PhonePe", "UPI QR"].map((provider) => (
          <div className="rounded-md border border-border p-4" key={provider}>
            <p className="font-medium">{provider}</p>
            <p className="mt-1 text-sm text-muted-foreground">Provider contract only. No live API integration.</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    style: "currency",
  }).format(amountCents / 100);
}
