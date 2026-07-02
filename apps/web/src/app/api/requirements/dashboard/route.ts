import { requirementContext, requirementError, requirementResponse } from "@/server/requirements/http";

export async function GET() {
  try {
    const { context, service } = await requirementContext();
    return requirementResponse(await service.dashboard(context));
  } catch (error) {
    return requirementError(error);
  }
}

