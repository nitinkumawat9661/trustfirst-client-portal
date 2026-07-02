import type { NextRequest } from "next/server";
import { clientCreateSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse, parseJson } from "@/server/crm/http";

export async function GET() {
  try {
    const { context, service } = await crmContext();
    return crmResponse(await service.listClients(context));
  } catch (error) {
    return crmError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, service } = await crmContext();
    const input = await parseJson(request, clientCreateSchema);
    return crmResponse(await service.createClient(context, input), 201);
  } catch (error) {
    return crmError(error);
  }
}

