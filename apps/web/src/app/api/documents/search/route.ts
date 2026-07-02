import type { NextRequest } from "next/server";
import {
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
  commercialDocumentSearchSchema,
} from "@/server/commercial-documents";

export async function GET(request: NextRequest) {
  try {
    const query = commercialDocumentSearchSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
    });
    const { context, service } = await commercialDocumentContext();
    return commercialDocumentResponse(await service.search(context, query.q));
  } catch (error) {
    return commercialDocumentError(error);
  }
}
