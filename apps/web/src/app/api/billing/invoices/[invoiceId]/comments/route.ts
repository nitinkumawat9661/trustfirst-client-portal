import type { NextRequest } from "next/server";
import { billingContext, billingError, billingResponse, invoiceCommentSchema, parseBillingJson } from "@/server/billing";

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const { context, service } = await billingContext();
    const input = await parseBillingJson(request, invoiceCommentSchema);
    return billingResponse(await service.addComment(context, invoiceId, input), 201);
  } catch (error) {
    return billingError(error);
  }
}
