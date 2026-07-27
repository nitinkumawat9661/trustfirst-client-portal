import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareImportExecuteSchema, hardwareResponse, parseHardwareImportRequest, parseHardwareJson } from "@/server/hardware";
import { assertCsrfSafeRequest } from "@/server/security";

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const { context, service } = await hardwareContext();
    const input = request.headers.get("content-type")?.includes("multipart/form-data")
      ? hardwareImportExecuteSchema.parse(await parseHardwareImportRequest(request))
      : await parseHardwareJson(request, hardwareImportExecuteSchema);
    return hardwareResponse(await service.executeImport(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
