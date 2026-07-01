import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { AuthenticationService } from "@/server/auth/auth-service";
import { requireCurrentUser } from "@/server/auth/session";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { readNextRequestMetadata } from "@/server/security/request-metadata";

export async function POST(request: NextRequest) {
  assertCsrfSafeRequest(request);

  const user = await requireCurrentUser();
  const service = new AuthenticationService(getPrisma());
  await service.logoutAllDevices(user.id, readNextRequestMetadata(request));

  return NextResponse.json({ ok: true });
}

