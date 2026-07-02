import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";

export default function HardwareReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Returns</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Sale and purchase returns</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Return reversal</CardTitle></CardHeader>
        <CardContent className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          Sale returns add stock back. Purchase returns deduct stock from the selected location.
        </CardContent>
      </Card>
    </div>
  );
}
