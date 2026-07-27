import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwarePartyUpdateSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ partyId: string }> }) {
  try {
    const input = await parseHardwareJson(request, hardwarePartyUpdateSchema);
    const { partyId } = await params;
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.updateParty(context, partyId, input));
  } catch (error) {
    return hardwareError(error);
  }
}
