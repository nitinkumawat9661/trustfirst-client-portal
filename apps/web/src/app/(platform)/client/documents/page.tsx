import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { FileText } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { requireCurrentUser } from "@/server/auth/session";
import { CommercialDocumentService } from "@/server/commercial-documents";

export const dynamic = "force-dynamic";

export default async function ClientDocumentsPage() {
  const user = await requireCurrentUser();
  const service = new CommercialDocumentService(getPrisma());
  const documents = await service.list({
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });

  return (
    <AppShell mode="client">
      <div className="mb-6">
        <Badge>Documents</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Commercial documents</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Client-facing access to approved and in-review commercial documents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
              No client-visible documents are available yet.
            </div>
          ) : (
            documents.map((document) => (
              <Link
                className="flex flex-col gap-2 rounded-md border border-border p-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                href={`/client/documents/${document.id}`}
                key={document.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <FileText aria-hidden className="size-4 text-muted-foreground" />
                  <p className="font-medium">{document.title}</p>
                  <Badge>{document.status.toLowerCase().replaceAll("_", " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{document.documentNumber}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
