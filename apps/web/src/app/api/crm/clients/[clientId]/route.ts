import type { NextRequest } from "next/server";
import { clientUpdateSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    return crmResponse(await service.getWorkspace(context, clientId));
  } catch (error) {
    return crmError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    const input = await parseJson(request, clientUpdateSchema);
    return crmResponse(await service.updateClient(context, clientId, input));
  } catch (error) {
    return crmError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const { clientId } = await params;
    const { context, service } = await crmContext();
    return crmResponse(await service.softDeleteClient(context, clientId));
  } catch (error) {
    return crmError(error);
  }
}

