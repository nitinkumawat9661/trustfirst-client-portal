import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext } from "@/server/hardware";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.convertQuotationToSale(context, documentId), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
