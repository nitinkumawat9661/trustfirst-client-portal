import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { passwordResetRequestSchema } from "@/server/auth/schemas";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { sanitizeRecord } from "@/server/security/sanitize";

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = passwordResetRequestSchema.parse(body);
  const service = new AuthenticationService(getPrisma());
  const result = await service.requestPasswordReset(input, readNextRequestMetadata(request));

  return NextResponse.json({
    ok: true,
    data: {
      tokenIssued: Boolean(result.token),
    },
  });
}

