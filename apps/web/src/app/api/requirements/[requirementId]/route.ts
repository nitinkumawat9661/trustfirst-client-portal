import type { NextRequest } from "next/server";
import { requirementContext, requirementError, requirementResponse } from "@/server/requirements/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> },
) {
  try {
    const { requirementId } = await params;
    const { context, service } = await requirementContext();
    return requirementResponse(await service.get(context, requirementId));
  } catch (error) {
    return requirementError(error);
  }
}

