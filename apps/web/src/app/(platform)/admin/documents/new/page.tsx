import { Badge } from "@trustfirst/ui";
import { DocumentFormShell } from "@/components/documents/document-form-shell";

export default function AdminNewDocumentPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>New document</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Create commercial document</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Draft-first form foundation for configurable document templates and tenant branding.
        </p>
      </div>
      <DocumentFormShell />
    </div>
  );
}
