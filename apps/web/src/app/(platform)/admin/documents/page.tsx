import { getPrisma } from "@trustfirst/database";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/session";
import { CommercialDocumentService, type CommercialDocumentSummary } from "@/server/commercial-documents";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const user = await requireCurrentUser();
  const service = new CommercialDocumentService(getPrisma());
  const documents: CommercialDocumentSummary[] = await service.list({
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge>Commercial documents</Badge>
          <h1 className="mt-4 text-3xl font-semibold">Document engine</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Quotations, proposals, estimates, agreements, work orders, and receipts with tenant-scoped numbering and approvals.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          href="/admin/documents/new"
        >
          <Plus aria-hidden className="size-4" />
          New document
        </Link>
      </div>

      <div className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
        <Search aria-hidden className="size-4" />
        Search UI connects to /api/documents/search
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Latest tenant documents excluding archived records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
              No commercial documents have been created yet.
            </div>
          ) : (
            documents.map((document) => (
              <Link
                className="flex flex-col gap-2 rounded-md border border-border p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                href={`/admin/documents/${document.id}`}
                key={document.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText aria-hidden className="size-4 text-muted-foreground" />
                    <p className="font-medium">{document.title}</p>
                    <Badge>{document.type.toLowerCase().replaceAll("_", " ")}</Badge>
                    <Badge>{document.status.toLowerCase().replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {document.documentNumber} · v{document.currentVersion}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{document.updatedAt.toLocaleDateString()}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
