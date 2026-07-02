import type { NextRequest } from "next/server";
import { exportPlanSchema } from "@/server/crm";
import { crmContext, crmError, crmResponse } from "@/server/crm/http";

export async function GET(request: NextRequest) {
  try {
    const input = exportPlanSchema.parse({
      format: request.nextUrl.searchParams.get("format") ?? "csv",
      scope: request.nextUrl.searchParams.get("scope") ?? "clients",
    });
    const { service } = await crmContext();
    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
    return crmResponse(
      service.planExport({
        format: input.format,
        scope: input.scope,
        ...(clientId ? { clientId } : {}),
      }),
    );
  } catch (error) {
    return crmError(error);
  }
}
