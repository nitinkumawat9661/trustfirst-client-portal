import { AppError } from "../domain/errors";
import {
  normalizeRequestHost,
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "../domain/host-routing";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertCsrfSafeRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (fetchSite === "cross-site") {
    throwCsrfError();
  }

  const originHeader = request.headers.get("origin");
  const effectiveHost = readEffectiveHost(request.headers);

  if (!originHeader || !effectiveHost) {
    throwCsrfError();
  }

  let origin: URL;

  try {
    origin = new URL(originHeader);
  } catch {
    throwCsrfError();
  }

  const originHost = normalizeRequestHost(origin.host);
  const isProduction = process.env.NODE_ENV === "production";

  if (originHost !== effectiveHost) {
    throwCsrfError();
  }

  if (isProduction) {
    if (
      origin.protocol !== "https:" ||
      resolveAppSurfaceFromHost(effectiveHost) === "UNKNOWN"
    ) {
      throwCsrfError();
    }

    return;
  }

  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    throwCsrfError();
  }

  if (
    resolveAppSurfaceFromHost(effectiveHost) === "UNKNOWN" &&
    !LOCAL_HOSTS.has(effectiveHost)
  ) {
    throwCsrfError();
  }
}

function throwCsrfError(): never {
  throw new AppError({
    code: "FORBIDDEN",
    message: "CSRF validation failed.",
    status: 403,
  });
}
