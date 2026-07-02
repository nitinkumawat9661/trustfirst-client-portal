import type { NextRequest } from "next/server";
import { csvImportPreviewSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, csvImportPreviewSchema);
    const { service } = await crmContext();
    return crmResponse(service.previewCsvImport(input.csv));
  } catch (error) {
    return crmError(error);
  }
}

