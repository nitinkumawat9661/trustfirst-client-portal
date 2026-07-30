import { NextResponse, type NextRequest } from "next/server";
import { readNextRequestMetadata } from "./request-metadata";

export type SecurityHeaderContext = {
  contentSecurityPolicy: string;
  correlationId: string;
  requestHeaders: Headers;
  requestId: string;
};

export function createSecurityHeaderContext(request: NextRequest): SecurityHeaderContext {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = isProduction
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "'self' 'unsafe-eval' 'unsafe-inline'";
  const metadata = readNextRequestMetadata(request);
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src 'self' ${isProduction ? `'nonce-${nonce}'` : "'unsafe-inline'"}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("content-security-policy", contentSecurityPolicy);
  requestHeaders.set("x-correlation-id", metadata.correlationId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", metadata.requestId);

  return {
    contentSecurityPolicy,
    correlationId: metadata.correlationId,
    requestHeaders,
    requestId: metadata.requestId,
  };
}

export function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  context: SecurityHeaderContext = createSecurityHeaderContext(request),
) {
  const isProduction = process.env.NODE_ENV === "production";
  const pathname = request.nextUrl.pathname;

  response.headers.set("content-security-policy", context.contentSecurityPolicy);
  response.headers.set("x-request-id", context.requestId);
  response.headers.set("x-correlation-id", context.correlationId);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-permitted-cross-domain-policies", "none");
  response.headers.set("referrer-policy", "no-referrer");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
  );

  if (isProduction) {
    response.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }

  if (pathname.startsWith("/api/") || pathname === "/signin" || pathname === "/sign-in") {
    response.headers.set("cache-control", "no-store, max-age=0");
    response.headers.set("pragma", "no-cache");
  }

  return response;
}
