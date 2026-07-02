import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function HardwareBrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Hardware catalog</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Brands</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Brands</CardTitle></CardHeader>
        <CardContent className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Brand records are tenant-scoped and connected to products/SKUs.
        </CardContent>
      </Card>
    </div>
  );
}
