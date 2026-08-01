export type EstimateMoneyLine = {
  discountCents?: number | null;
  quantity: number;
  taxCents?: number | null;
  taxRateBps?: number | null;
  unitAmountCents: number;
};

export type EstimateMoneyTotals = {
  discountCents: number;
  grossCents: number;
  roundOffCents: number;
  taxCents: number;
  taxableCents: number;
  totalBeforeRoundOffCents: number;
  totalCents: number;
};

export function calculateNearestRupeeRoundOffCents(amountCents: number) {
  assertIntegerMoney(amountCents, "Amount before round-off");
  return Math.round(amountCents / 100) * 100 - amountCents;
}

export function calculateEstimateMoneyTotals(lines: EstimateMoneyLine[]): EstimateMoneyTotals {
  const result = lines.reduce(
    (totals, line) => {
      assertFinite(line.quantity, "Quantity");
      assertIntegerMoney(line.unitAmountCents, "Unit amount");
      const discountCents = line.discountCents ?? 0;
      assertIntegerMoney(discountCents, "Discount");
      const taxRateBps = line.taxRateBps ?? 0;
      assertFinite(taxRateBps, "GST rate");

      const grossCents = Math.round(line.quantity * line.unitAmountCents);
      const taxableCents = Math.max(grossCents - discountCents, 0);
      const taxCents = line.taxCents ?? Math.round((taxableCents * taxRateBps) / 10_000);
      assertIntegerMoney(taxCents, "Tax");

      return {
        discountCents: totals.discountCents + discountCents,
        grossCents: totals.grossCents + grossCents,
        taxCents: totals.taxCents + taxCents,
        taxableCents: totals.taxableCents + taxableCents,
      };
    },
    { discountCents: 0, grossCents: 0, taxCents: 0, taxableCents: 0 },
  );
  const totalBeforeRoundOffCents = result.taxableCents + result.taxCents;
  const roundOffCents = calculateNearestRupeeRoundOffCents(totalBeforeRoundOffCents);
  return {
    ...result,
    roundOffCents,
    totalBeforeRoundOffCents,
    totalCents: totalBeforeRoundOffCents + roundOffCents,
  };
}

export function applyAutomaticEstimateRoundOff<T extends { items: EstimateMoneyLine[] }>(input: T) {
  return {
    ...input,
    roundOffCents: calculateEstimateMoneyTotals(input.items).roundOffCents,
  };
}

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function assertIntegerMoney(value: number, label: string) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer number of paise.`);
}
