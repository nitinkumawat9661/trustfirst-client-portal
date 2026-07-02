import { billingContext, billingError, billingResponse } from "@/server/billing";

export async function GET() {
  try {
    const { service } = await billingContext();
    return billingResponse(service.providerContracts());
  } catch (error) {
    return billingError(error);
  }
}
