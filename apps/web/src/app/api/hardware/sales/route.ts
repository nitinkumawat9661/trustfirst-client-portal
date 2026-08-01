import { HardwareTradeDocumentType } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { applyAutomaticEstimateRoundOff } from "@/lib/hardware/estimate-money";
import { hardwareError, hardwareResponse, hardwareSalesDocumentSchema, hardwareTradeContext, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.listSales(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, hardwareSalesDocumentSchema);
    const type = input.type ?? HardwareTradeDocumentType.SALES_ORDER;
    const normalizedInput = type === HardwareTradeDocumentType.SALES_QUOTATION
      ? applyAutomaticEstimateRoundOff({ ...input, type })
      : { ...input, type };
    return hardwareResponse(await service.create(context, normalizedInput), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
