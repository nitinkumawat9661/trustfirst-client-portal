import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirementContext, requirementError, requirementResponse } from "@/server/requirements/http";

const querySchema = z.object({
  from: z.coerce.number().int().positive(),
  to: z.coerce.number().int().positive(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requirementId: string }> },
) {
  try {
    const { requirementId } = await params;
    const query = querySchema.parse({
      from: request.nextUrl.searchParams.get("from"),
      to: request.nextUrl.searchParams.get("to"),
    });
    const { context, service } = await requirementContext();
    return requirementResponse(
      await service.compareVersions(context, requirementId, query.from, query.to),
    );
  } catch (error) {
    return requirementError(error);
  }
}

