import { AppError } from "../domain/errors";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const windowMs = 10 * 60 * 1000;
const maxSubmissions = 5;
const submissions = new Map<string, RateLimitRecord>();

export function enforcePublicIntakeRateLimit(key: string, now = Date.now()) {
  const existing = submissions.get(key);

  if (!existing || existing.resetAt <= now) {
    submissions.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= maxSubmissions) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many intake submissions. Please try again later.",
      status: 429,
    });
  }

  existing.count += 1;
}
