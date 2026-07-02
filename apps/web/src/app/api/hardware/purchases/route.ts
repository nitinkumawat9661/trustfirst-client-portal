import { HardwareTradeDocumentType } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext, hardwareTradeDocumentSchema, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.listPurchases(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, hardwareTradeDocumentSchema);
    return hardwareResponse(await service.create(context, { ...input, type: input.type ?? HardwareTradeDocumentType.PURCHASE_ORDER }), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
