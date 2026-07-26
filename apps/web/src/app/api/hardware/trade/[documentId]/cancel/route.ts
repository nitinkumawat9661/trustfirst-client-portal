import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeCancelSchema, hardwareTradeContext, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, hardwareTradeCancelSchema);
    return hardwareResponse(await service.cancelSale(context, documentId, input));
  } catch (error) {
    return hardwareError(error);
  }
}
