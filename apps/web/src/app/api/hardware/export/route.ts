import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";

export async function GET() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.csvExport(context));
  } catch (error) {
    return hardwareError(error);
  }
}
