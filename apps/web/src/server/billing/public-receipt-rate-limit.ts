import { AppError } from "../domain/errors";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const windowMs = 10 * 60 * 1000;
const maxLookups = 20;
const lookups = new Map<string, RateLimitRecord>();

export function enforcePublicReceiptRateLimit(
  key: string,
  now = Date.now(),
) {
  const normalizedKey = key.trim() || "unknown";
  const existing = lookups.get(normalizedKey);

  if (!existing || existing.resetAt <= now) {
    lookups.set(normalizedKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (existing.count >= maxLookups) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many receipt lookup attempts. Please try again later.",
      status: 429,
    });
  }

  existing.count += 1;
}

export function resetPublicReceiptRateLimitForTests() {
  lookups.clear();
}