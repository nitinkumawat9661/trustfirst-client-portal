import { type NextRequest } from "next/server";
import { hardwareError, hardwareFinancialAdjustmentSchema, hardwareFinancialContext, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const input = await parseHardwareJson(request, hardwareFinancialAdjustmentSchema);
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.recordAdjustment(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
