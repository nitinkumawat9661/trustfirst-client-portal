import type { NextRequest } from "next/server";
import { milestoneUpdateSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> },
) {
  try {
    const { milestoneId, projectId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, milestoneUpdateSchema);
    return projectResponse(await service.updateMilestone(context, projectId, milestoneId, input));
  } catch (error) {
    return projectError(error);
  }
}

