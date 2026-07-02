import type { NextRequest } from "next/server";
import { clientContactCreateSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    const input = await parseJson(request, clientContactCreateSchema);
    return crmResponse(await service.addContact(context, clientId, input), 201);
  } catch (error) {
    return crmError(error);
  }
}

