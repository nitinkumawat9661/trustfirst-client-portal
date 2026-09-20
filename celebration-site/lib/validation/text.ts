export function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export function digitsOnly(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : ""
}
