import type { NextRequest } from "next/server";
import { requirementCreateSchema } from "@/server/requirements";
import {
  parseRequirementJson,
  requirementContext,
  requirementError,
  requirementResponse,
} from "@/server/requirements/http";

export async function GET() {
  try {
    const { context, service } = await requirementContext();
    return requirementResponse(await service.list(context));
  } catch (error) {
    return requirementError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await requirementContext();
    const input = await parseRequirementJson(request, requirementCreateSchema);
    return requirementResponse(await service.create(context, input), 201);
  } catch (error) {
    return requirementError(error);
  }
}

