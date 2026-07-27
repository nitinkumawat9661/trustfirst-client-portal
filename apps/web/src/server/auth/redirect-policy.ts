import { CANONICAL_ORIGINS } from "../domain/host-routing";

const approvedProductionOrigins = new Set<string>([
  CANONICAL_ORIGINS.mangalamPublic,
  CANONICAL_ORIGINS.mangalamErp,
  CANONICAL_ORIGINS.trustFirstPortal,
]);

export function isApprovedAuthOrigin(origin: string) {
  if (approvedProductionOrigins.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

export function safeAuthRedirect(url: string, baseUrl: string) {
  const fallback = isApprovedAuthOrigin(baseUrl)
    ? baseUrl
    : CANONICAL_ORIGINS.trustFirstPortal;

  if (url.startsWith("/") && !url.startsWith("//")) {
    return `${fallback}${url}`;
  }

  try {
    const target = new URL(url);
    return isApprovedAuthOrigin(target.origin)
      ? target.toString()
      : fallback;
  } catch {
    return fallback;
  }
}
