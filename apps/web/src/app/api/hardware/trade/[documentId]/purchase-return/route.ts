import { type NextRequest } from "next/server";
import { hardwareError, hardwarePurchaseReturnSchema, hardwareResponse, hardwareTradeContext, parseHardwareJson } from "@/server/hardware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const input = await parseHardwareJson(request, hardwarePurchaseReturnSchema);
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.createPurchaseReturn(context, documentId, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
