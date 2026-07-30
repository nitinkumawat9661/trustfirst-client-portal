import { NextResponse, type NextRequest } from "next/server";
import { readNextRequestMetadata } from "./request-metadata";

export function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = isProduction
    ? `'self' 'nonce-${nonce}'`
    : "'self' 'unsafe-eval' 'unsafe-inline'";
  const metadata = readNextRequestMetadata(request);
  const pathname = request.nextUrl.pathname;

  response.headers.set("x-request-id", metadata.requestId);
  response.headers.set("x-correlation-id", metadata.correlationId);
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
  response.headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
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
    ].join("; "),
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
