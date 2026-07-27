import { type NextRequest } from "next/server";
import { hardwareCustomerRefundSchema, hardwareError, hardwareFinancialContext, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const input = await parseHardwareJson(request, hardwareCustomerRefundSchema);
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.recordCustomerRefund(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
