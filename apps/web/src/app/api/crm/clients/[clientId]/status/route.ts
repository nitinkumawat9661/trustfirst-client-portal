import type { NextRequest } from "next/server";
import { clientStatusTransitionSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    const input = await parseJson(request, clientStatusTransitionSchema);
    return crmResponse(await service.transitionStatus(context, clientId, input));
  } catch (error) {
    return crmError(error);
  }
}

