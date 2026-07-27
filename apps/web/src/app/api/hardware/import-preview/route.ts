import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareImportPreviewSchema, hardwareResponse, parseHardwareJson, parseHardwareImportRequest } from "@/server/hardware";
import { assertCsrfSafeRequest } from "@/server/security";

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const { context, service } = await hardwareContext();
    const input = request.headers.get("content-type")?.includes("multipart/form-data")
      ? hardwareImportPreviewSchema.parse(await parseHardwareImportRequest(request))
      : await parseHardwareJson(request, hardwareImportPreviewSchema);
    return hardwareResponse(await service.importPreview(context, input));
  } catch (error) {
    return hardwareError(error);
  }
}
