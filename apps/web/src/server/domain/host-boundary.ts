import { NextResponse, type NextRequest } from "next/server";
import {
  CANONICAL_ORIGINS,
  type AppSurface,
} from "./host-routing";

const trustFirstPagePrefixes = [
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

export function enforceHostBoundary(
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
    if (pathname === "/signin") {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/sign-in",
      );
    }

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

    if (pathname === "/client" || pathname.startsWith("/client/")) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/admin",
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstPagePrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamPublic,
        "/",
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
    if (pathname === "/signin") {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/sign-in",
      );
    }

    if (
      pathname === "/client" ||
      (pathname.startsWith("/client/") && !pathname.startsWith("/client/hardware"))
    ) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/admin",
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstPagePrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/admin",
      );
    }

    if (matchesAnyPrefix(pathname, trustFirstAdminPrefixes)) {
      return redirectAcrossSurface(
        request,
        CANONICAL_ORIGINS.mangalamErp,
        "/admin",
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
