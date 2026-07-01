import { NextResponse, type NextRequest } from "next/server";

export function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev ? "'self' 'unsafe-eval' 'unsafe-inline'" : `'self' 'nonce-${nonce}'`;

  response.headers.set("x-request-id", request.headers.get("x-request-id") ?? nonce);
  response.headers.set("x-correlation-id", request.headers.get("x-correlation-id") ?? nonce);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
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
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  return response;
}

