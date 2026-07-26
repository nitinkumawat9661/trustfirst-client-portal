import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { adminResetPasswordSchema } from "@/server/auth/schemas";
import { requireCurrentUser } from "@/server/auth/session";
import { isAppError } from "@/server/domain/errors";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { sanitizeRecord } from "@/server/security/sanitize";

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const user = await requireCurrentUser();
    const tenantId = user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Active tenant is required." }, ok: false }, { status: 403 });
    }
    const input = adminResetPasswordSchema.parse(sanitizeRecord((await request.json()) as Record<string, unknown>));
    const service = new AuthenticationService(getPrisma());
    await service.adminResetPassword(user.id, tenantId, input, readNextRequestMetadata(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: { code: error.code, message: error.message }, ok: false }, { status: error.status });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Password reset could not be completed." }, ok: false }, { status: 500 });
  }
}
