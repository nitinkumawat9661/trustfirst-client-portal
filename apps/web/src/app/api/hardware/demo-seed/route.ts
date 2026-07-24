import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";
import { assertCsrfSafeRequest } from "@/server/security";

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.seedDemoData(context), 201);
  } catch (error) {
    return hardwareError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.resetDemoData(context));
  } catch (error) {
    return hardwareError(error);
  }
}
