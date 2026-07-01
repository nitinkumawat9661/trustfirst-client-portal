import { AppError } from "../domain/errors";
import type { ApiMiddleware } from "./types";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitRecord>();

export function rateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): ApiMiddleware {
  return async (context, next) => {
    const key = `${context.tenant.id}:${clientKey(context.request)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next(context);
    }

    if (current.count >= limit) {
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
        status: 429,
      });
    }

    current.count += 1;
    buckets.set(key, current);

    return next(context);
  };
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}
