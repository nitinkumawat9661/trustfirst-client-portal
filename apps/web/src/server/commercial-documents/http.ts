import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { requireCurrentUser } from "../auth/session";
import { isAppError } from "../domain/errors";
import { assertCsrfSafeRequest } from "../security";
import { sanitizeRecord } from "../security/sanitize";
import { CommercialDocumentService } from "./commercial-document-service";

export async function commercialDocumentContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new CommercialDocumentService(getPrisma()),
  };
}

export async function parseCommercialDocumentJson<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  assertCsrfSafeRequest(request);
  const body = sanitizeRecord((await request.json()) as Record<string, unknown>);
  return schema.parse(body);
}

export function commercialDocumentResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, ok: true }, { status });
}

export function commercialDocumentError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: { code: error.code, details: error.details, message: error.message }, ok: false },
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
    { error: { code: "INTERNAL_ERROR", message: "Unexpected document error." }, ok: false },
    { status: 500 },
  );
}
