import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function HardwareCategoriesPage() {
  return <HardwareReferenceShell title="Categories" />;
}

function HardwareReferenceShell({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Hardware catalog</Badge>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Tenant-scoped reference data managed through hardware API contracts.
        </CardContent>
      </Card>
    </div>
  );
}
