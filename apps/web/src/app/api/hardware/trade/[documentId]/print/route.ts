import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext } from "@/server/hardware";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.printProjection(context, documentId));
  } catch (error) {
    return hardwareError(error);
  }
}
