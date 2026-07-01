import type { NextRequest } from "next/server";

export type RequestMetadata = {
  correlationId: string;
  ipAddress?: string | undefined;
  requestId: string;
  userAgent?: string | undefined;
};

export function readRequestMetadata(request: Request): RequestMetadata {
  const requestId = readHeader(request, "x-request-id") ?? crypto.randomUUID();
  const correlationId =
    readHeader(request, "x-correlation-id") ?? readHeader(request, "x-request-id") ?? requestId;

  return {
    correlationId,
    ipAddress:
      readHeader(request, "x-forwarded-for")?.split(",")[0]?.trim() ??
      readHeader(request, "x-real-ip") ??
      undefined,
    requestId,
    userAgent: readHeader(request, "user-agent") ?? undefined,
  };
}

export function readNextRequestMetadata(request: NextRequest): RequestMetadata {
  return readRequestMetadata(request);
}

function readHeader(request: Request, name: string) {
  return request.headers.get(name);
}
