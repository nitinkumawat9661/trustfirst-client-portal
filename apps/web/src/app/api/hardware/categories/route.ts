import type { NextRequest } from "next/server";
import { hardwareCategorySchema, hardwareContext, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.listCategories(context));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await hardwareContext();
    const input = await parseHardwareJson(request, hardwareCategorySchema);
    return hardwareResponse(await service.createCategory(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
