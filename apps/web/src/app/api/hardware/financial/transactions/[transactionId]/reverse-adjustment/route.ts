import type { NextRequest } from "next/server";
import {
  hardwareError,
  hardwareFinancialAdjustmentReversalSchema,
  hardwareFinancialContext,
  hardwareResponse,
  parseHardwareJson,
} from "@/server/hardware";

export async function POST(request: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  try {
    const input = await parseHardwareJson(request, hardwareFinancialAdjustmentReversalSchema);
    const { transactionId } = await params;
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.reverseAdjustment(context, transactionId, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
