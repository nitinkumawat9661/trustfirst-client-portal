import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { changePasswordSchema } from "@/server/auth/schemas";
import { requireCurrentUser } from "@/server/auth/session";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { sanitizeRecord } from "@/server/security/sanitize";

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const user = await requireCurrentUser();
  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = changePasswordSchema.parse(body);
  const service = new AuthenticationService(getPrisma());
  await service.changePassword(user.id, input, readNextRequestMetadata(request));

  return NextResponse.json({ ok: true });
}

