import type { NextRequest } from "next/server";
import { clientNoteCreateSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    const input = await parseJson(request, clientNoteCreateSchema);
    return crmResponse(await service.addNote(context, clientId, input), 201);
  } catch (error) {
    return crmError(error);
  }
}

