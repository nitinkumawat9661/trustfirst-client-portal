import type { NextRequest } from "next/server";
import { clientSearchSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse } from "@/server/crm/http";

export async function GET(request: NextRequest) {
  try {
    const input = clientSearchSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
    });
    const { context, service } = await crmContext();
    return crmResponse(await service.search(context, input.q));
  } catch (error) {
    return crmError(error);
  }
}

