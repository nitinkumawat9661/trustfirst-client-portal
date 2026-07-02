import type { HardwareTradeItemInput } from "./trade-schemas";
import type { HardwareTradeTotals } from "./trade-types";

export function calculateTradeTotals(
  items: HardwareTradeItemInput[],
  roundOffCents = 0,
): HardwareTradeTotals {
  const subtotalCents = items.reduce(
    (total, item) => total + item.quantity * item.unitAmountCents,
    0,
  );
  const discountCents = items.reduce(
    (total, item) => total + (item.discountCents ?? 0),
    0,
  );
  const taxCents = items.reduce((total, item) => {
    const taxable = Math.max(item.quantity * item.unitAmountCents - (item.discountCents ?? 0), 0);
    return total + Math.round((taxable * (item.taxRateBps ?? 0)) / 10_000);
  }, 0);
  return {
    discountCents,
    roundOffCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents - discountCents + taxCents + roundOffCents,
  };
}
