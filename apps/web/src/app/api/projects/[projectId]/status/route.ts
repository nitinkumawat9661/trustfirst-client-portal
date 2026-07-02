import type { NextRequest } from "next/server";
import { projectStatusSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, projectStatusSchema);
    return projectResponse(await service.transitionStatus(context, projectId, input));
  } catch (error) {
    return projectError(error);
  }
}

