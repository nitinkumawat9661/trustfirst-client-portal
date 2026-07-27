import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";
import { enforceHostBoundary } from "@/server/domain/host-boundary";
import { applySecurityHeaders } from "@/server/security/headers";

const protectedRoutes = [
  "/admin",
  "/client",
  "/master",
  "/api/admin",
  "/api/client",
  "/api/crm",
  "/api/master",
  "/api/projects",
  "/api/requirements",
  "/api/tenants",
  "/api/auth/change-password",
  "/api/auth/logout-all-devices",
  "/api/auth/refresh-session",
];

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const host = readEffectiveHost(request.headers);
  const surface = resolveAppSurfaceFromHost(host);

  const boundaryResponse = enforceHostBoundary(request, surface);

  if (boundaryResponse) {
    return applySecurityHeaders(boundaryResponse, request);
  }

  const isProtected = protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );

  if (isProtected && !request.auth?.user?.id) {
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
