import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareImportExecuteSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareImportExecuteSchema);
    return hardwareResponse(await service.executeImport(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
