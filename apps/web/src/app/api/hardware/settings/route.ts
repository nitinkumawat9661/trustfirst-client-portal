import type { NextRequest } from "next/server";
import { hardwareBusinessSettingsSchema, hardwareContext, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.getSettings(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareBusinessSettingsSchema);
    return hardwareResponse(await service.saveSettings(context, input));
  } catch (error) {
    return hardwareError(error);
  }
}
