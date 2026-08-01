import type { NextRequest } from "next/server";
import { applyAutomaticEstimateRoundOff } from "@/lib/hardware/estimate-money";
import {
  hardwareError,
  hardwareEstimateUpdateSchema,
  hardwareResponse,
  hardwareTradeContext,
  parseHardwareJson,
} from "@/server/hardware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    const input = await parseHardwareJson(request, hardwareEstimateUpdateSchema);
    return hardwareResponse(
      await service.updateEstimate(context, documentId, applyAutomaticEstimateRoundOff(input)),
    );
  } catch (error) {
    return hardwareError(error);
  }
}
