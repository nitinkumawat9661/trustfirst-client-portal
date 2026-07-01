import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readSessionToken, requireCurrentUser } from "@/server/auth/session";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { sanitizeRecord } from "@/server/security/sanitize";
import { TenantApplicationService } from "@/server/tenants/tenant-service";

const switchTenantSchema = z.object({
  tenantId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const user = await requireCurrentUser();
  const sessionToken = readSessionToken(request);

  if (!sessionToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = switchTenantSchema.parse(body);
  const service = new TenantApplicationService(getPrisma());
  const tenant = await service.switchTenant({
    request: readNextRequestMetadata(request),
    sessionToken,
    tenantId: input.tenantId,
    userId: user.id,
  });

  return NextResponse.json({ ok: true, data: tenant });
}

