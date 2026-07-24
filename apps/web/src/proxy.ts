import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  CANONICAL_ORIGINS,
  readEffectiveHost,
  resolveAppSurfaceFromHost,
  type AppSurface,
} from "@/server/domain/host-routing";
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

const trustFirstPagePrefixes = [
  "/client",
  "/master",
  "/intake",
];

const trustFirstApiPrefixes = [
  "/api/client",
  "/api/crm",
  "/api/master",
  "/api/projects",
  "/api/requirements",
];

const trustFirstAdminPrefixes = [
  "/admin/requirements",
  "/admin/release-checklist",
  "/admin/plugins",
];

const mangalamErpPagePrefixes = [
  "/admin/hardware",
  "/client/hardware",
];

const mangalamErpApiPrefixes = [
  "/api/hardware",
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
    const signInUrl = new URL("/sign-in", request.nextUrl);

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

function enforceHostBoundary(
  request: NextRequest,
  surface: AppSurface,
): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  /*
   * Keep localhost, direct IP and unknown hosts on legacy behavior
   * while migration/testing is in progress.
   */
  if (surface === "UNKNOWN") {
    return null;
  }

  /*
   * Public Mangalam website:
   * only intentionally public APIs may be reachable.
   */
  if (surface === "MANGALAM_PUBLIC") {
    if (
      pathname === "/sign-in" ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/")
    ) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstPagePrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.trustFirstPortal,
      );
    }

    if (
      pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/public/") &&
      pathname !== "/api/health"
    ) {
      return hiddenApiResponse();
    }

    return null;
  }

  /*
   * Mangalam ERP:
   * keep TrustFirst CRM/project/intake/internal admin surfaces away
   * from the tenant ERP hostname.
   */
  if (surface === "MANGALAM_ERP") {
    if (matchesAnyPrefix(pathname, trustFirstPagePrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.trustFirstPortal,
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstAdminPrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.trustFirstPortal,
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstApiPrefixes)) {
      return hiddenApiResponse();
    }

    return null;
  }

  /*
   * TrustFirst portal:
   * do not expose Mangalam's operational ERP routes/APIs here.
   */
  if (surface === "TRUSTFIRST_PORTAL") {
    if (matchesAnyPrefix(pathname, mangalamErpPagePrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
      );
    }

    if (matchesAnyPrefix(pathname, mangalamErpApiPrefixes)) {
      return hiddenApiResponse();
    }

    /*
     * Bare /admin currently renders Mangalam's hardware dashboard.
     * Until TrustFirst has a dedicated admin landing page, route the
     * TrustFirst hostname to its client workspace instead.
     */
    if (pathname === "/admin") {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.trustFirstPortal,
        "/client",
      );
    }
  }

  return null;
}

function matchesAnyPrefix(
  pathname: string,
  prefixes: readonly string[],
) {
  return prefixes.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  );
}

function redirectAcrossSurface(
  request: NextRequest,
  origin: string,
  pathnameOverride?: string,
) {
  const target = new URL(origin);

  target.pathname =
    pathnameOverride ?? request.nextUrl.pathname;

  target.search = request.nextUrl.search;

  return NextResponse.redirect(target, 307);
}

function hiddenApiResponse() {
  return NextResponse.json(
    { error: "Not found." },
    { status: 404 },
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
