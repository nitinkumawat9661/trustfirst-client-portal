import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { emailVerificationRequestSchema } from "@/server/auth/schemas";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { sanitizeRecord } from "@/server/security/sanitize";

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = emailVerificationRequestSchema.parse(body);
  const service = new AuthenticationService(getPrisma());
  const result = await service.requestEmailVerification(input);

  return NextResponse.json({
    ok: true,
    data: {
      tokenIssued: Boolean(result.token),
    },
  });
}
