import type { NextRequest } from "next/server";
import { projectUpdateSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { context, service } = await projectContext();
    return projectResponse(await service.get(context, projectId));
  } catch (error) {
    return projectError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, projectUpdateSchema);
    return projectResponse(await service.update(context, projectId, input));
  } catch (error) {
    return projectError(error);
  }
}

