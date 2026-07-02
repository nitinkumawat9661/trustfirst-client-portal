import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@trustfirst/ui";
import { FileText } from "lucide-react";

const documentTypes = ["Quotation", "Proposal", "Estimate", "Agreement", "Work Order", "Receipt"];

export function DocumentFormShell() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText aria-hidden className="size-5 text-muted-foreground" />
          <CardTitle>Create commercial document</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" aria-label="Commercial document form">
          <label className="grid gap-2 text-sm font-medium">
            Document type
            <select className="min-h-10 rounded-md border border-input bg-background px-3 text-sm">
              {documentTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Title
            <Input placeholder="Website redesign proposal" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Template
            <Input placeholder="standard-proposal-v1" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Summary
            <Textarea placeholder="Scope, assumptions, and commercial context" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium">
              Client ID
              <Input placeholder="Optional" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Project ID
              <Input placeholder="Optional" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Requirement ID
              <Input placeholder="Optional" />
            </label>
          </div>
          <div className="rounded-md border border-dashed border-border p-4">
            <Badge>Template driven</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Body content, branding, and reusable sections are stored as configurable document payloads.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button">Save draft</Button>
            <Button type="button" variant="outline">Submit for approval</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
