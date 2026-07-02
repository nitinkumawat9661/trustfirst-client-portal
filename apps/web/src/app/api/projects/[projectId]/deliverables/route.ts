import type { NextRequest } from "next/server";
import { deliverableSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, deliverableSchema);
    return projectResponse(await service.createDeliverable(context, projectId, input), 201);
  } catch (error) {
    return projectError(error);
  }
}

