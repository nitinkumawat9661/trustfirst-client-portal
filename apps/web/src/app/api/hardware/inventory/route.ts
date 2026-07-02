import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareMovementSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.dashboard(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareMovementSchema);
    return hardwareResponse(await service.recordMovement(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
