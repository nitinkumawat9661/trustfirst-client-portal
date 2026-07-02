import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";

export async function GET(request: NextRequest) {
  try {
    const barcode = request.nextUrl.searchParams.get("barcode") ?? "";
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.searchByBarcode(context, barcode));
  } catch (error) {
    return hardwareError(error);
  }
}
