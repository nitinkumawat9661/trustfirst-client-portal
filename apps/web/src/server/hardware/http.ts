import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { requireCurrentUser } from "../auth/session";
import { isAppError } from "../domain/errors";
import { assertCsrfSafeRequest } from "../security";
import { sanitizeRecord } from "../security/sanitize";
import { HardwareService } from "./hardware-service";
import { HardwareFinancialService } from "./financial-service";
import { HardwareDayClosingService } from "./day-closing-service";
import { HardwareTradeService } from "./trade-service";
import { HardwareBillEditService } from "./bill-edit-service";

export async function hardwareContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new HardwareService(getPrisma()),
  };
}

export async function hardwareTradeContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new HardwareTradeService(getPrisma()),
  };
}

export async function hardwareBillEditContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new HardwareBillEditService(getPrisma()),
  };
}

export async function hardwareFinancialContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new HardwareFinancialService(getPrisma()),
  };
}

export async function hardwareDayClosingContext() {
  const user = await requireCurrentUser();
  return {
    context: { tenantId: user.activeTenantId ?? "public", userId: user.id },
    service: new HardwareDayClosingService(getPrisma()),
  };
}

export async function parseHardwareJson<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  assertCsrfSafeRequest(request);
  return schema.parse(sanitizeRecord((await request.json()) as Record<string, unknown>));
}

export function hardwareResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data, ok: true }, { status });
}

export function hardwareError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ error: { code: error.code, details: error.details, message: error.message }, ok: false }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", details: error.issues, message: "Request validation failed." }, ok: false }, { status: 422 });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Unexpected hardware plugin error." }, ok: false }, { status: 500 });
}
