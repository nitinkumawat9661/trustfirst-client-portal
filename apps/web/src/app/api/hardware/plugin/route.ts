import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";

export async function GET() {
  try {
    const { service } = await hardwareContext();
    return hardwareResponse(service.manifest());
  } catch (error) {
    return hardwareError(error);
  }
}
