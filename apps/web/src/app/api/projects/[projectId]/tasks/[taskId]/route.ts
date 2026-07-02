import type { NextRequest } from "next/server";
import { taskUpdateSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const { projectId, taskId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, taskUpdateSchema);
    return projectResponse(await service.updateTask(context, projectId, taskId, input));
  } catch (error) {
    return projectError(error);
  }
}

