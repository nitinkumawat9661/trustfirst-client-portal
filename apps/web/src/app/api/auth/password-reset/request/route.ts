import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { LoginRateLimitService } from "@/server/auth/rate-limit-service";
import { passwordResetRequestSchema } from "@/server/auth/schemas";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { normalizeEmail, sanitizeRecord } from "@/server/security/sanitize";

const RESET_REQUEST_LIMIT = 5;
const RESET_REQUEST_WINDOW_MS = 60 * 60_000;

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = passwordResetRequestSchema.parse(body);
  const prisma = getPrisma();
  const metadata = readNextRequestMetadata(request);
  const limiter = new LoginRateLimitService(prisma);
  const rateLimitKey = `${metadata.ipAddress ?? "unknown"}:${normalizeEmail(input.email)}`;

  try {
    await limiter.consume({
      action: "password_reset_request",
      key: rateLimitKey,
      limit: RESET_REQUEST_LIMIT,
      windowMs: RESET_REQUEST_WINDOW_MS,
    });

    const service = new AuthenticationService(prisma);
    await service.requestPasswordReset(input, metadata);
  } catch {
    /*
     * Always return the same response. This prevents account enumeration and
     * does not reveal whether the request was accepted or rate limited.
     */
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        accepted: true,
      },
    },
    { status: 202 },
  );
}
