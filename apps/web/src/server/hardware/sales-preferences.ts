import type { Prisma } from "@trustfirst/database";

type SalesPreferenceItem = {
  discountCents?: number | null;
  metadata?: unknown;
  productId: string;
  quantity: number;
  taxRateBps?: number | null;
  unitAmountCents: number;
};

export type ProductSalesPreference = {
  discountBps: number;
  gstRateBps: number;
  productId: string;
};

export function collectLastSalesPreferences(
  items: SalesPreferenceItem[],
): ProductSalesPreference[] {
  const preferences = new Map<string, ProductSalesPreference>();

  for (const item of items) {
    const metadata = asRecord(item.metadata);
    const explicitDiscountPercent = readNumber(metadata.discountPercent);
    const grossCents = Math.max(item.quantity * item.unitAmountCents, 0);
    const derivedDiscountBps = grossCents > 0
      ? Math.round((Math.max(item.discountCents ?? 0, 0) * 10_000) / grossCents)
      : 0;

    preferences.set(item.productId, {
      discountBps: clampRateBps(
        explicitDiscountPercent === undefined
          ? derivedDiscountBps
          : Math.round(explicitDiscountPercent * 100),
      ),
      gstRateBps: clampRateBps(item.taxRateBps ?? 0),
      productId: item.productId,
    });
  }

  return [...preferences.values()];
}

export async function persistLastSalesPreferences(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: SalesPreferenceItem[],
) {
  const preferences = collectLastSalesPreferences(items);
  const updatedAt = new Date().toISOString();

  for (const preference of preferences) {
    const product = await tx.hardwareProduct.findFirst({
      select: { gstTaxConfig: true, metadata: true },
      where: { id: preference.productId, tenantId },
    });
    if (!product) throw new Error("Product was not found while saving sales preferences.");

    await tx.hardwareProduct.update({
      data: {
        gstTaxConfig: {
          ...asRecord(product.gstTaxConfig),
          rateBps: preference.gstRateBps,
        } as Prisma.InputJsonValue,
        metadata: {
          ...asRecord(product.metadata),
          lastSalesDiscountBps: preference.discountBps,
          lastSalesGstRateBps: preference.gstRateBps,
          lastSalesPreferencesUpdatedAt: updatedAt,
        } as Prisma.InputJsonValue,
      },
      where: { id: preference.productId },
    });
  }
}

function clampRateBps(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 10_000);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
