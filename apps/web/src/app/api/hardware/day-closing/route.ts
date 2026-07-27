import { type NextRequest } from "next/server";
import { hardwareDayClosingCloseSchema, hardwareDayClosingContext, hardwareError, hardwareResponse, parseHardwareJson } from "@/server/hardware";

export async function GET(request: NextRequest) {
  try {
    const { context, service } = await hardwareDayClosingContext();
    return hardwareResponse(await service.summary(context, request.nextUrl.searchParams.get("businessDate") ?? undefined));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseHardwareJson(request, hardwareDayClosingCloseSchema);
    const { context, service } = await hardwareDayClosingContext();
    return hardwareResponse(await service.close(context, input), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
