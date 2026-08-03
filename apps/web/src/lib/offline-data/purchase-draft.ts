import type { OfflineNumberSeries } from "./types";

export type OfflinePurchaseType = "PURCHASE_ENTRY" | "PURCHASE_ORDER" | "SUPPLIER_BILL";

export function offlinePurchaseSeries(
  value: unknown,
): Exclude<OfflineNumberSeries, "HPR" | "HSR" | "MS/INV"> | null {
  if (value === "PURCHASE_ENTRY") return "HPE";
  if (value === "PURCHASE_ORDER") return "HPO";
  if (value === "SUPPLIER_BILL") return "HSB";
  return null;
}

export function offlinePurchaseLabel(value: unknown) {
  if (value === "PURCHASE_ENTRY") return "Purchase entry";
  if (value === "PURCHASE_ORDER") return "Purchase order";
  if (value === "SUPPLIER_BILL") return "Supplier bill";
  return "Purchase document";
}
