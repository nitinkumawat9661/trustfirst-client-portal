import { projectContext, projectError, projectResponse } from "@/server/projects/http";

export async function GET() {
  try {
    const { context, service } = await projectContext();
    return projectResponse(await service.dashboard(context));
  } catch (error) {
    return projectError(error);
  }
}

