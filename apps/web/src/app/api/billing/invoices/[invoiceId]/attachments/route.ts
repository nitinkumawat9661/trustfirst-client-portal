import type { NextRequest } from "next/server";
import { billingContext, billingError, billingResponse, invoiceAttachmentSchema, parseBillingJson } from "@/server/billing";

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const { context, service } = await billingContext();
    const input = await parseBillingJson(request, invoiceAttachmentSchema);
    return billingResponse(await service.addAttachment(context, invoiceId, input), 201);
  } catch (error) {
    return billingError(error);
  }
}
