import { getPrisma } from "@trustfirst/database";
import { notFound } from "next/navigation";
import { DocumentDetailShell } from "@/components/documents/document-detail-shell";
import { requireCurrentUser } from "@/server/auth/session";
import { CommercialDocumentService, type CommercialDocumentWorkspace } from "@/server/commercial-documents";

export const dynamic = "force-dynamic";

export default async function AdminDocumentDetailPage({
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

  return <DocumentDetailShell document={document} />;
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
