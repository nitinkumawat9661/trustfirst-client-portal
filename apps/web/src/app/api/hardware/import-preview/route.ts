import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareImportPreviewSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareImportPreviewSchema);
    return hardwareResponse(await service.importPreview(context, input));
  } catch (error) {
    return hardwareError(error);
  }
}
