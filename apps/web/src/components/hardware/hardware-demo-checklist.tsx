import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { HardwareDemoReadiness } from "@/server/hardware";

export function HardwareDemoChecklist({ readiness }: { readiness: HardwareDemoReadiness }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>End-to-end demo checklist</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Setup status for a preview deployment walkthrough.</p>
          </div>
          <Badge>{readiness.ready ? "Ready" : "Needs attention"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Metric label="Products" value={readiness.counts.products} />
          <Metric label="Customers" value={readiness.counts.customers} />
          <Metric label="Stock locations" value={readiness.counts.stockLocations} />
        </div>
        <div className="grid gap-3">
          {readiness.items.map((item) => (
            <div className="flex items-start gap-3 rounded-md border border-border p-4" key={item.key}>
              {item.ready ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 text-primary" />
              ) : (
                <CircleAlert aria-hidden className="mt-0.5 size-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="font-mono text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
