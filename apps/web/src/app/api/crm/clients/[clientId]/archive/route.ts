import type { NextRequest } from "next/server";
import { assertCsrfSafeRequest } from "@/server/security";
import { crmContext, crmError, crmResponse } from "@/server/crm/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    assertCsrfSafeRequest(request);
    const { clientId } = await params;
    const { context, service } = await crmContext();
    return crmResponse(await service.archiveClient(context, clientId));
  } catch (error) {
    return crmError(error);
  }
}

