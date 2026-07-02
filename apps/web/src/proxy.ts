import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { applySecurityHeaders } from "@/server/security/headers";

const protectedRoutes = [
  "/admin",
  "/client",
  "/api/crm",
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

  if (isProtected && !request.auth?.user?.id) {
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
