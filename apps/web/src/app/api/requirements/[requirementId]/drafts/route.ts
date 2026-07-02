import type { NextRequest } from "next/server";
import { requirementDraftSaveSchema } from "@/server/requirements";
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
    const input = await parseRequirementJson(request, requirementDraftSaveSchema);
    return requirementResponse(await service.saveDraft(context, requirementId, input), 201);
  } catch (error) {
    return requirementError(error);
  }
}

