import type { NextRequest } from "next/server";
import { billingContext, billingError, billingResponse, invoiceUpdateSchema, parseBillingJson } from "@/server/billing";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const { context, service } = await billingContext();
    return billingResponse(await service.getInvoice(context, invoiceId));
  } catch (error) {
    return billingError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const { invoiceId } = await params;
    const { context, service } = await billingContext();
    const input = await parseBillingJson(request, invoiceUpdateSchema);
    return billingResponse(await service.updateDraft(context, invoiceId, input));
  } catch (error) {
    return billingError(error);
  }
}
