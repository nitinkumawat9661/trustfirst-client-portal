import { AppError } from "@/server/domain/errors";
import { hardwareError } from "@/server/hardware";

export async function PATCH() {
  try {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Use the audited bill editor to update an Estimate Bill.",
      status: 410,
    });
  } catch (error) {
    return hardwareError(error);
  }
}
