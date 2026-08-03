export type OfflineEstimatePrintPreview = {
  customer: {
    address: string | null;
    name: string;
    referenceNumber: string | null;
  };
  documentDate: string;
  documentNumber: string;
  firm: {
    address: string | null;
    email: string | null;
    gstin: string | null;
    name: string;
    phone: string | null;
    termsFooter: string | null;
  };
  generatedAt: string;
  items: Array<{
    description: string;
    discountPercent: number;
    hsnCode: string | null;
    lineTotalCents: number;
    quantity: number;
    taxCents: number;
    taxRateBps: number;
    taxableCents: number;
    unitCode: string | null;
    unitRateCents: number;
  }>;
  paymentMode: string;
  taxMode: "inter-state" | "intra-state";
  totals: {
    discountCents: number;
    grossCents: number;
    paidAmountCents: number;
    roundOffCents: number;
    taxCents: number;
    taxableCents: number;
    totalCents: number;
  };
};

export function formatOfflineAddress(address: Record<string, unknown> | null | undefined) {
  if (!address) return null;
  const values = Object.values(address)
    .filter((value): value is string | number =>
      (typeof value === "string" && Boolean(value.trim())) || typeof value === "number",
    )
    .map((value) => String(value).trim())
    .filter(Boolean);
  return values.length > 0 ? values.join(", ") : null;
}
