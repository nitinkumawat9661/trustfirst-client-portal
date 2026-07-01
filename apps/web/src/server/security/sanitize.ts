export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function sanitizeString(value: string, maxLength = 512) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeRecord<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizeString(value) : value,
    ]),
  ) as T;
}

