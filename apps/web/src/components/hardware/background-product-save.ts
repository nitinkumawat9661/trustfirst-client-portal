export const backgroundProductSaveEvent = "trustfirst:product-save-status";

export type BackgroundProductSaveStatus = {
  message: string;
  returnHref?: string;
  state: "error" | "pending" | "success";
  updatedAt: string;
};

const storageKey = "trustfirst.hardware.background-product-save";

export function publishBackgroundProductSave(status: Omit<BackgroundProductSaveStatus, "updatedAt">) {
  if (typeof window === "undefined") return;
  const next = { ...status, updatedAt: new Date().toISOString() };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // The event still keeps the current product page informed when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<BackgroundProductSaveStatus>(backgroundProductSaveEvent, { detail: next }));
}

export function readBackgroundProductSave(): BackgroundProductSaveStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (
      (record.state !== "pending" && record.state !== "success" && record.state !== "error") ||
      typeof record.message !== "string" ||
      typeof record.updatedAt !== "string"
    ) {
      return null;
    }
    return value as BackgroundProductSaveStatus;
  } catch {
    return null;
  }
}

export function clearBackgroundProductSave() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<BackgroundProductSaveStatus | null>(backgroundProductSaveEvent, { detail: null }));
}
