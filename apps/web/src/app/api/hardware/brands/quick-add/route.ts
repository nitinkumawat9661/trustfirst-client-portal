import { z } from "zod";
import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

const quickNameSchema = z.object({ name: z.string().trim().min(2).max(160) });

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, quickNameSchema);
    return hardwareResponse(await service.quickCreateBrand(context, input.name), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
