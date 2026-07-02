import type { NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse, hardwareSearchSchema } from "@/server/hardware";

export async function GET(request: NextRequest) {
  try {
    const query = hardwareSearchSchema.parse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.search(context, query.q));
  } catch (error) {
    return hardwareError(error);
  }
}
