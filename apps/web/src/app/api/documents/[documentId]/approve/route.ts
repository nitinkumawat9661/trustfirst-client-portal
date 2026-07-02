import type { NextRequest } from "next/server";
import {
  commercialDocumentApprovalSchema,
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
  parseCommercialDocumentJson,
} from "@/server/commercial-documents";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await commercialDocumentContext();
    const input = await parseCommercialDocumentJson(request, commercialDocumentApprovalSchema);
    return commercialDocumentResponse(await service.approve(context, documentId, input));
  } catch (error) {
    return commercialDocumentError(error);
  }
}
