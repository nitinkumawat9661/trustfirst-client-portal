import { type NextRequest } from "next/server";
import { hardwareDayClosingContext, hardwareDayClosingReopenSchema, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ closingId: string }> },
) {
  try {
    const { closingId } = await params;
    const input = await parseHardwareJson(request, hardwareDayClosingReopenSchema);
    const { context, service } = await hardwareDayClosingContext();
    return hardwareResponse(await service.reopen(context, closingId, input));
  } catch (error) {
    return hardwareError(error);
  }
}
