import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";

export async function POST() {
  try {
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.seedDemoData(context), 201);
  } catch (error) {
    return hardwareError(error);
  }
}
