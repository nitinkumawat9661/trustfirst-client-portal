import { getPrisma } from "@trustfirst/database";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { DocumentDetailShell } from "@/components/documents/document-detail-shell";
import { requireCurrentUser } from "@/server/auth/session";
import { CommercialDocumentService, type CommercialDocumentWorkspace } from "@/server/commercial-documents";

export const dynamic = "force-dynamic";

export default async function ClientDocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireCurrentUser();
  const service = new CommercialDocumentService(getPrisma());
  const document = await loadDocument(service, {
    documentId,
    tenantId: user.activeTenantId ?? "public",
    userId: user.id,
  });

  return (
    <AppShell mode="client">
      <DocumentDetailShell document={document} />
    </AppShell>
  );
}

async function loadDocument(
  service: CommercialDocumentService,
  input: { documentId: string; tenantId: string; userId: string },
): Promise<CommercialDocumentWorkspace> {
  try {
    return await service.get({
      tenantId: input.tenantId,
      userId: input.userId,
    }, input.documentId);
  } catch {
    notFound();
  }
}
