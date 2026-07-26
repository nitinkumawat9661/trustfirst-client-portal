import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse, parseHardwareJson, quickHardwareProductSchema } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, quickHardwareProductSchema);
    return hardwareResponse(await service.quickCreateProduct(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
