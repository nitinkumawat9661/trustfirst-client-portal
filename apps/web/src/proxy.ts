import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isHttpStagingAuthBypassEnabled } from "@/server/auth/staging-auth-bypass-gate";
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
  const { nextUrl } = request;
  const isProtected = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route),
  );

  const stagingBypass = isHttpStagingAuthBypassEnabled({
    host: request.headers.get("host"),
    internalQaHeader: request.headers.get("x-trustfirst-internal-qa"),
  });

  if (isProtected && !request.auth?.user?.id && !stagingBypass) {
    const signInUrl = new URL("/sign-in", nextUrl);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return applySecurityHeaders(NextResponse.redirect(signInUrl), request);
  }

  return applySecurityHeaders(NextResponse.next(), request);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
