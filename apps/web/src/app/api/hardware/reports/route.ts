import { hardwareError, hardwareResponse, hardwareTradeContext } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareTradeContext();
    return hardwareResponse(await service.reports(context));
  } catch (error) {
    return hardwareError(error);
  }
}
