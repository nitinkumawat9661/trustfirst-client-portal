import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext, hardwareTradeStatusSchema, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, hardwareTradeStatusSchema);
    return hardwareResponse(await service.confirm(context, documentId, input));
  } catch (error) {
    return hardwareError(error);
  }
}
