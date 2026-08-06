import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateSource = readFileSync(new URL("./estimate-bill-form.tsx", import.meta.url), "utf8");
const quickPosSource = readFileSync(new URL("./quick-pos-form.tsx", import.meta.url), "utf8");

describe("customer bill payment choice", () => {
  it("requires paid, unpaid, or partial status in Estimate Bills", () => {
    expect(estimateSource).toContain("resolveBillPayment");
    expect(estimateSource).toContain("Select paid or unpaid");
    expect(estimateSource).not.toContain("blank = full for non-credit");
  });

  it("requires the same explicit status in Quick POS invoices", () => {
    expect(quickPosSource).toContain("resolveBillPayment");
    expect(quickPosSource).toContain("Select paid or unpaid");
    expect(quickPosSource).toContain("!paymentChoice");
  });
});
