import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareProductSchema, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.listProducts(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareProductSchema);
    return hardwareResponse(await service.createProduct(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
