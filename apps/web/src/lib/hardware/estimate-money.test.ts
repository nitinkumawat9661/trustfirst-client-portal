import { describe, expect, it } from "vitest";
import {
  applyAutomaticEstimateRoundOff,
  calculateEstimateMoneyTotals,
  calculateNearestRupeeRoundOffCents,
} from "./estimate-money";

describe("Estimate Bill money totals", () => {
  it("rounds the final amount to the nearest rupee", () => {
    expect(calculateNearestRupeeRoundOffCents(435_560)).toBe(40);
    expect(calculateNearestRupeeRoundOffCents(435_640)).toBe(-40);
  });

  it("reproduces line discount and GST rounding before automatic round-off", () => {
    const totals = calculateEstimateMoneyTotals([
      { discountCents: 38_181, quantity: 1, taxRateBps: 1_800, unitAmountCents: 191_000 },
      { discountCents: 51_000, quantity: 1, taxRateBps: 1_800, unitAmountCents: 170_000 },
      { discountCents: 41_700, quantity: 1, taxRateBps: 1_800, unitAmountCents: 139_000 },
    ]);
    expect(totals).toMatchObject({
      discountCents: 130_881,
      grossCents: 500_000,
      roundOffCents: 40,
      taxCents: 66_441,
      taxableCents: 369_119,
      totalCents: 435_600,
    });
  });

  it("overrides a client supplied arbitrary Estimate round-off", () => {
    const normalized = applyAutomaticEstimateRoundOff({
      items: [{ discountCents: 0, quantity: 1, taxRateBps: 1_800, unitAmountCents: 10_001 }],
      roundOffCents: 999,
    });
    expect(normalized.roundOffCents).not.toBe(999);
    expect(normalized.roundOffCents).toBe(-1);
  });
});
