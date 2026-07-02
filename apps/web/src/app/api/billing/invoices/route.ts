import type { NextRequest } from "next/server";
import { billingContext, billingError, billingResponse, invoiceCreateSchema, parseBillingJson } from "@/server/billing";

export async function GET() {
  try {
    const { context, service } = await billingContext();
    return billingResponse(await service.listInvoices(context));
  } catch (error) {
    return billingError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await billingContext();
    const input = await parseBillingJson(request, invoiceCreateSchema);
    return billingResponse(await service.createInvoice(context, input), 201);
  } catch (error) {
    return billingError(error);
  }
}
