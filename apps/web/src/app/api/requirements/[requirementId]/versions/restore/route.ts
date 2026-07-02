import type { NextRequest } from "next/server";
import { versionRestoreSchema } from "@/server/requirements";
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
    const input = await parseRequirementJson(request, versionRestoreSchema);
    return requirementResponse(await service.restoreVersion(context, requirementId, input.version));
  } catch (error) {
    return requirementError(error);
  }
}

