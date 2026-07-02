import type { NextRequest } from "next/server";
import {
  commercialDocumentCreateSchema,
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
  parseCommercialDocumentJson,
} from "@/server/commercial-documents";

export async function GET() {
  try {
    const { context, service } = await commercialDocumentContext();
    return commercialDocumentResponse(await service.list(context));
  } catch (error) {
    return commercialDocumentError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await commercialDocumentContext();
    const input = await parseCommercialDocumentJson(request, commercialDocumentCreateSchema);
    return commercialDocumentResponse(await service.create(context, input), 201);
  } catch (error) {
    return commercialDocumentError(error);
  }
}
