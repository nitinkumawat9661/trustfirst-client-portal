import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext, parseHardwareJson, quickPosSaleSchema } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, quickPosSaleSchema);
    return hardwareResponse(await service.postQuickPosSale(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
