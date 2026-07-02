import type { NextRequest } from "next/server";
import { billingContext, billingError, billingResponse, invoiceStatusSchema, parseBillingJson } from "@/server/billing";

export async function POST(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const { context, service } = await billingContext();
    const input = await parseBillingJson(request, invoiceStatusSchema);
    return billingResponse(await service.transitionInvoice(context, invoiceId, input));
  } catch (error) {
    return billingError(error);
  }
}
