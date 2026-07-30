import { normalizeRequestHost } from "../domain/host-routing";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const FORWARDED_HEADERS = [
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
] as const;

export function isDirectLoopbackSessionHealthProbe(input: {
  headers: Pick<Headers, "get">;
  method: string;
  pathname: string;
}) {
  if (input.method.toUpperCase() !== "GET") {
    return false;
  }

  if (input.pathname !== "/api/auth/session") {
    return false;
  }

  const host = normalizeRequestHost(input.headers.get("host"));

  if (!LOOPBACK_HOSTS.has(host)) {
    return false;
  }

  if (
    input.headers.get("authorization") ||
    input.headers.get("cookie") ||
    input.headers.get("origin") ||
    input.headers.get("sec-fetch-site")
  ) {
    return false;
  }

  return FORWARDED_HEADERS.every((name) => !input.headers.get(name));
}
