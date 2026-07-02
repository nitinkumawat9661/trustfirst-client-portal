import type { NextRequest } from "next/server";
import {
  commercialDocumentCommentSchema,
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
    const input = await parseCommercialDocumentJson(request, commercialDocumentCommentSchema);
    return commercialDocumentResponse(await service.addComment(context, documentId, input), 201);
  } catch (error) {
    return commercialDocumentError(error);
  }
}
