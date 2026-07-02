import type { NextRequest } from "next/server";
import { hardwareBrandSchema, hardwareContext, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.listBrands(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareBrandSchema);
    return hardwareResponse(await service.createBrand(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
