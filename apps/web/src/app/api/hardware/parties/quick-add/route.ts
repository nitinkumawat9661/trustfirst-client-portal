import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse, parseHardwareJson, quickHardwarePartySchema } from "@/server/hardware";

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, quickHardwarePartySchema);
    return hardwareResponse(await service.quickCreateParty(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
