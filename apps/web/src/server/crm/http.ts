import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { requireCurrentUser } from "../auth/session";
import { isAppError } from "../domain/errors";
import { assertCsrfSafeRequest } from "../security/csrf";
import { sanitizeRecord } from "../security/sanitize";
import { ClientService } from "./client-service";

export async function crmContext() {
  const user = await requireCurrentUser();

  if (!user.activeTenantId) {
    return {
      service: new ClientService(getPrisma()),
      user,
      context: { tenantId: "public", userId: user.id },
    };
  }

  return {
    service: new ClientService(getPrisma()),
    user,
    context: { tenantId: user.activeTenantId, userId: user.id },
  };
}

export async function parseJson<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  assertCsrfSafeRequest(request);
  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  return schema.parse(body);
}

export function crmResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, ok: true }, { status });
}

export function crmError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: { code: error.code, details: error.details, message: error.message },
        ok: false,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          details: error.issues,
          message: "Request validation failed.",
        },
        ok: false,
      },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected CRM error.",
      },
      ok: false,
    },
    { status: 500 },
  );
}

