import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";
import { enforceHostBoundary } from "@/server/domain/host-boundary";
import { assertCsrfSafeRequest } from "@/server/security/csrf";
import { applySecurityHeaders } from "@/server/security/headers";

const protectedRoutes = [
  "/admin",
  "/client",
  "/master",
  "/api/admin",
  "/api/client",
  "/api/crm",
  "/api/hardware",
  "/api/master",
  "/api/projects",
  "/api/requirements",
  "/api/tenants",
  "/api/auth/admin",
  "/api/auth/change-password",
  "/api/auth/logout-all-devices",
  "/api/auth/refresh-session",
];

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const host = readEffectiveHost(request.headers);
  const surface = resolveAppSurfaceFromHost(host);

  if (process.env.NODE_ENV === "production" && surface === "UNKNOWN") {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Not found." },
        { status: 421 },
      ),
      request,
    );
  }

  const boundaryResponse = enforceHostBoundary(request, surface);

  if (boundaryResponse) {
    return applySecurityHeaders(boundaryResponse, request);
  }

  const isProtected = protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
  const isProtectedApi = isProtected && pathname.startsWith("/api/");

  if (isProtected && !request.auth?.user?.id) {
    if (isProtectedApi) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Authentication is required." },
          { status: 401 },
        ),
        request,
      );
    }

    const signInPath = surface === "MANGALAM_ERP" ? "/signin" : "/sign-in";
    const signInUrl = new URL(signInPath, request.nextUrl);

    signInUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return applySecurityHeaders(
      NextResponse.redirect(signInUrl),
      request,
    );
  }

  if (isProtectedApi) {
    try {
      assertCsrfSafeRequest(request);
    } catch {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Request origin validation failed." },
          { status: 403 },
        ),
        request,
      );
    }
  }

  return applySecurityHeaders(
    NextResponse.next(),
    request,
  );
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
