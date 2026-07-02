import type { NextRequest } from "next/server";
import { deliverableReviewSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string; projectId: string }> },
) {
  try {
    const { deliverableId, projectId } = await params;
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, deliverableReviewSchema);
    return projectResponse(await service.reviewDeliverable(context, projectId, deliverableId, input));
  } catch (error) {
    return projectError(error);
  }
}

