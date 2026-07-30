import { isIP } from "node:net";
import type { NextRequest } from "next/server";

export type RequestMetadata = {
  correlationId: string;
  ipAddress?: string | undefined;
  requestId: string;
  userAgent?: string | undefined;
};

const MAX_ID_LENGTH = 128;
const MAX_USER_AGENT_LENGTH = 512;
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]+$/u;

export function readRequestMetadata(request: Request): RequestMetadata {
  const requestId = readSafeId(request, "x-request-id") ?? crypto.randomUUID();
  const correlationId =
    readSafeId(request, "x-correlation-id") ??
    readSafeId(request, "x-request-id") ??
    requestId;

  return {
    correlationId,
    ipAddress: readClientIp(request),
    requestId,
    userAgent: readBoundedHeader(request, "user-agent", MAX_USER_AGENT_LENGTH),
  };
}

export function readNextRequestMetadata(request: NextRequest): RequestMetadata {
  return readRequestMetadata(request);
}

export function readClientIp(request: Request) {
  const realIp = normalizeIp(readHeader(request, "x-real-ip"));

  if (realIp) {
    return realIp;
  }

  const forwarded = readHeader(request, "x-forwarded-for")
    ?.split(",")
    .map((entry) => normalizeIp(entry))
    .filter((entry): entry is string => Boolean(entry));

  /*
   * Use the right-most valid address. A correctly configured reverse proxy
   * appends or overwrites this value, while a client can spoof the left side.
   */
  return forwarded?.at(-1);
}

function normalizeIp(value: string | null | undefined) {
  if (!value) return undefined;

  let candidate = value.trim();

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/u.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"));
  }

  return isIP(candidate) ? candidate : undefined;
}

function readSafeId(request: Request, name: string) {
  const value = readBoundedHeader(request, name, MAX_ID_LENGTH);

  return value && SAFE_ID_PATTERN.test(value) ? value : undefined;
}

function readBoundedHeader(request: Request, name: string, maxLength: number) {
  const value = readHeader(request, name)?.trim();

  if (!value || value.length > maxLength || /[\r\n]/u.test(value)) {
    return undefined;
  }

  return value;
}

function readHeader(request: Request, name: string) {
  return request.headers.get(name);
}
