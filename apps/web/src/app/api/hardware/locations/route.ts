import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareLocationSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.listLocations(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareLocationSchema);
    return hardwareResponse(await service.createLocation(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
