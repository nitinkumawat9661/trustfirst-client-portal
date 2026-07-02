import type { NextRequest } from "next/server";
import { projectCreateSchema } from "@/server/projects";
import { parseProjectJson, projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function GET() {
  try {
    const { context, service } = await projectContext();
    return projectResponse(await service.list(context));
  } catch (error) {
    return projectError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await projectContext();
    const input = await parseProjectJson(request, projectCreateSchema);
    return projectResponse(await service.create(context, input), 201);
  } catch (error) {
    return projectError(error);
  }
}

