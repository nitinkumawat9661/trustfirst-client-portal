import { type NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext, hardwareTradeCorrectionAssessmentSchema, parseHardwareJson } from "@/server/hardware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const input = await parseHardwareJson(request, hardwareTradeCorrectionAssessmentSchema);
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.assessCorrection(context, documentId, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
