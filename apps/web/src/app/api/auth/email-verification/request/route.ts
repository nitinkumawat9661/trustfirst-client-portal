import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { LoginRateLimitService } from "@/server/auth/rate-limit-service";
import { emailVerificationRequestSchema } from "@/server/auth/schemas";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";
import { normalizeEmail, sanitizeRecord } from "@/server/security/sanitize";

const VERIFICATION_REQUEST_LIMIT = 5;
const VERIFICATION_REQUEST_WINDOW_MS = 60 * 60_000;

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  const input = emailVerificationRequestSchema.parse(body);
  const prisma = getPrisma();
  const metadata = readNextRequestMetadata(request);
  const limiter = new LoginRateLimitService(prisma);
  const rateLimitKey = `${metadata.ipAddress ?? "unknown"}:${normalizeEmail(input.email)}`;

  try {
    await limiter.consume({
      action: "email_verification_request",
      key: rateLimitKey,
      limit: VERIFICATION_REQUEST_LIMIT,
      windowMs: VERIFICATION_REQUEST_WINDOW_MS,
    });

    const service = new AuthenticationService(prisma);
    await service.requestEmailVerification(input);
  } catch {
    /* Keep the response indistinguishable for existing and unknown accounts. */
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
