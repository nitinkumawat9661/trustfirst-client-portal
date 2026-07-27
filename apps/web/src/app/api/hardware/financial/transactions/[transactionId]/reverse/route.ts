import { type NextRequest } from "next/server";
import { hardwareError, hardwareFinancialContext, hardwarePaymentReversalSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params;
    const input = await parseHardwareJson(request, hardwarePaymentReversalSchema);
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.reversePayment(context, transactionId, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
