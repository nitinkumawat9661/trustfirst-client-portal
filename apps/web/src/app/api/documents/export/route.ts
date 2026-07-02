import {
  commercialDocumentContext,
  commercialDocumentError,
  commercialDocumentResponse,
} from "@/server/commercial-documents";

export async function GET() {
  try {
    const { context, service } = await commercialDocumentContext();
    return commercialDocumentResponse(await service.csvExportContract(context));
  } catch (error) {
    return commercialDocumentError(error);
  }
}
