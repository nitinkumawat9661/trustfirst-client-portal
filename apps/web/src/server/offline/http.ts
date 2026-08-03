import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "../domain/errors";

export function offlineResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    { data, ok: true },
    {
      headers: { "Cache-Control": "no-store, private" },
      status,
    },
  );
}

export function offlineError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: { code: error.code, details: error.details, message: error.message }, ok: false },
      { headers: { "Cache-Control": "no-store, private" }, status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: error.issues, message: "Offline setup validation failed." }, ok: false },
      { headers: { "Cache-Control": "no-store, private" }, status: 422 },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Unexpected offline setup error." }, ok: false },
    { headers: { "Cache-Control": "no-store, private" }, status: 500 },
  );
}
