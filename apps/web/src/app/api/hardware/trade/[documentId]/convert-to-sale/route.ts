import type { NextRequest } from "next/server";
import { hardwareError, hardwareResponse, hardwareTradeContext } from "@/server/hardware";
import { assertCsrfSafeRequest } from "@/server/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    assertCsrfSafeRequest(request);
    const { documentId } = await params;
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.convertQuotationToSale(context, documentId), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
