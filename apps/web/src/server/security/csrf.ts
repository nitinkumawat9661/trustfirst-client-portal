import { AppError } from "../domain/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function assertCsrfSafeRequest(request: Request) {
  if (SAFE_METHODS.has(request.method)) {
    return;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "CSRF validation failed.",
      status: 403,
    });
  }

  const originHost = new URL(origin).host;

  if (originHost !== host) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "CSRF validation failed.",
      status: 403,
    });
  }
}

