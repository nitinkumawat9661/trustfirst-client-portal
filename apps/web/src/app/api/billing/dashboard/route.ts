import { billingContext, billingError, billingResponse } from "@/server/billing";

export async function GET() {
  try {
    const { context, service } = await billingContext();
    return billingResponse(await service.dashboard(context));
  } catch (error) {
    return billingError(error);
  }
}
