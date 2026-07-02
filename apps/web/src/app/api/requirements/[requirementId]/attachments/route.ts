import type { NextRequest } from "next/server";
import { requirementAttachmentSchema } from "@/server/requirements";
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
    const input = await parseRequirementJson(request, requirementAttachmentSchema);
    return requirementResponse(await service.addAttachment(context, requirementId, input), 201);
  } catch (error) {
    return requirementError(error);
  }
}

