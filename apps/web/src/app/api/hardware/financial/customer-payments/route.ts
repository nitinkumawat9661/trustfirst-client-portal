import { type NextRequest } from "next/server";
import { hardwareError, hardwareFinancialContext, hardwarePartyPaymentSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const input = await parseHardwareJson(request, hardwarePartyPaymentSchema);
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.recordCustomerPayment(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
