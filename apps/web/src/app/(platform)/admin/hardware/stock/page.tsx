import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function HardwareStockPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Stock</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Stock movements</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Stock in, stock out, and adjustments</CardTitle></CardHeader>
        <CardContent className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Immutable inventory movement ledger with supplier/customer links and low-stock alerts.
        </CardContent>
      </Card>
    </div>
  );
}
