import type { NextRequest } from "next/server";
import { requirementApprovalSchema } from "@/server/requirements";
import {
  parseRequirementJson,
  requirementContext,
  requirementError,
  requirementResponse,
} from "@/server/requirements/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> },
) {
  try {
    const { requirementId } = await params;
    const { context, service } = await requirementContext();
    const input = await parseRequirementJson(request, requirementApprovalSchema);
    return requirementResponse(await service.transitionApproval(context, requirementId, input));
  } catch (error) {
    return requirementError(error);
  }
}

