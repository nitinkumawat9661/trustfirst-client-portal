import { NextResponse } from "next/server";
import type { ErrorCode } from "../domain/errors";

export type ApiSuccess<TData> = {
  ok: true;
  data: TData;
  meta: {
    requestId: string;
  };
};

export type ApiFailure = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
  };
};

export type ApiEnvelope<TData> = ApiSuccess<TData> | ApiFailure;

export function ok<TData>(
  data: TData,
  { requestId, status = 200 }: { requestId: string; status?: number },
) {
  return NextResponse.json<ApiSuccess<TData>>(
    {
      ok: true,
      data,
      meta: { requestId },
    },
    { status },
  );
}

export function fail(
  error: ApiFailure["error"],
  { requestId, status }: { requestId: string; status: number },
) {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      error,
      meta: { requestId },
    },
    { status },
  );
}
