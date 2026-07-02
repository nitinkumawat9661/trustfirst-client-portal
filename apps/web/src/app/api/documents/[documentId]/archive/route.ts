import type { NextRequest } from "next/server";
import {
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
} from "@/server/commercial-documents";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await commercialDocumentContext();
    return commercialDocumentResponse(await service.archive(context, documentId));
  } catch (error) {
    return commercialDocumentError(error);
  }
}
