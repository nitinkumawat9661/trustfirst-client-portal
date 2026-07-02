import type { NextRequest } from "next/server";
import { projectSearchSchema } from "@/server/projects";
import { projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function GET(request: NextRequest) {
  try {
    const input = projectSearchSchema.parse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    const { context, service } = await projectContext();
    return projectResponse(await service.search(context, input.q));
  } catch (error) {
    return projectError(error);
  }
}

