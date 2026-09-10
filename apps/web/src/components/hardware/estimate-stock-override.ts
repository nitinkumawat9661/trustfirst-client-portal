import type { HardwareApiResult } from "./hardware-api-client";

type StockShortage = {
  available?: unknown;
  productName?: unknown;
  required?: unknown;
};

export function isInsufficientStockResult(result: HardwareApiResult<unknown>) {
  if (result.ok || !result.details || typeof result.details !== "object") return false;
  return (result.details as Record<string, unknown>).reason === "INSUFFICIENT_STOCK";
}

export function confirmEstimateStockOverride(result: HardwareApiResult<unknown>) {
  if (!isInsufficientStockResult(result) || typeof window === "undefined") return false;
  return window.confirm(stockOverrideMessage(result));
}

export function stockOverrideMessage(result: HardwareApiResult<unknown>) {
  if (result.ok) return "";
  const details = result.details && typeof result.details === "object"
    ? result.details as Record<string, unknown>
    : {};
  const shortages = Array.isArray(details.shortages)
    ? details.shortages as StockShortage[]
    : [];
  const lines = shortages.flatMap((shortage) => {
    if (
      typeof shortage.productName !== "string" ||
      typeof shortage.required !== "number" ||
      typeof shortage.available !== "number"
    ) {
      return [];
    }
    return [`• ${shortage.productName}: required ${shortage.required}, available ${shortage.available}`];
  });
  return [
    "Stock warning",
    lines.length ? lines.join("\n") : result.message,
    "",
    "Stock update kiye bina Estimate Bill post aur print karna hai? Isse stock negative dikh sakta hai.",
    "OK dabakar proceed karein, Cancel dabakar stock update karein.",
  ].filter((line) => line !== "").join("\n");
}
