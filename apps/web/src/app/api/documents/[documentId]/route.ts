import type { NextRequest } from "next/server";
import {
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
  commercialDocumentUpdateSchema,
  parseCommercialDocumentJson,
} from "@/server/commercial-documents";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await commercialDocumentContext();
    return commercialDocumentResponse(await service.get(context, documentId));
  } catch (error) {
    return commercialDocumentError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await commercialDocumentContext();
    const input = await parseCommercialDocumentJson(request, commercialDocumentUpdateSchema);
    return commercialDocumentResponse(await service.updateDraft(context, documentId, input));
  } catch (error) {
    return commercialDocumentError(error);
  }
}
