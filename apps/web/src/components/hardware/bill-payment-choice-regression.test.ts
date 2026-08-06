import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dialogSource = readFileSync(
  new URL("./bill-payment-confirmation-dialog.tsx", import.meta.url),
  "utf8",
);
const estimateSource = readFileSync(new URL("./estimate-bill-form.tsx", import.meta.url), "utf8");
const purchaseSource = readFileSync(new URL("./hardware-trade-form.tsx", import.meta.url), "utf8");
const quickPosSource = readFileSync(new URL("./quick-pos-form.tsx", import.meta.url), "utf8");

describe("post-bill payment accounting confirmation", () => {
  it("uses one explicit payment screen for customer bills", () => {
    expect(dialogSource).toContain("How was this bill paid?");
    expect(dialogSource).toContain("Paid in full");
    expect(dialogSource).toContain("Unpaid / credit");
    expect(dialogSource).toContain("Partially paid");
    expect(estimateSource).toContain("BillPaymentConfirmationDialog");
    expect(quickPosSource).toContain("BillPaymentConfirmationDialog");
    expect(quickPosSource).not.toContain("!paymentChoice");
  });

  it("uses the same decision for supplier payable posting", () => {
    expect(dialogSource).toContain("How was this purchase paid?");
    expect(purchaseSource).toContain('direction="payable"');
    expect(purchaseSource).toContain("purchasePayment?.paidAmountCents");
    expect(purchaseSource).toContain("final stock and supplier-ledger posting failed");
  });
});
