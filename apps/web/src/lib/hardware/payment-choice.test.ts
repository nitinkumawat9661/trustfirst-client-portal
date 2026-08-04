import { describe, expect, it } from "vitest";
import { resolveBillPayment } from "./payment-choice";

describe("resolveBillPayment", () => {
  it("requires an explicit choice before bill generation", () => {
    expect(() => resolveBillPayment({
      choice: "",
      enteredPaidAmountCents: null,
      paymentMode: "Cash",
      totalCents: 10_000,
    })).toThrow("Select whether this bill is paid or unpaid");
  });

  it("posts an unpaid bill as credit with zero payment", () => {
    expect(resolveBillPayment({
      choice: "unpaid",
      enteredPaidAmountCents: null,
      paymentMode: "Cash",
      totalCents: 10_000,
    })).toEqual({ paidAmountCents: 0, paymentMode: "Credit" });
  });

  it("posts a paid bill for the exact grand total", () => {
    expect(resolveBillPayment({
      choice: "paid",
      enteredPaidAmountCents: null,
      paymentMode: "UPI",
      totalCents: 10_000,
    })).toEqual({ paidAmountCents: 10_000, paymentMode: "UPI" });
  });

  it("keeps partial payment strictly between zero and total", () => {
    expect(resolveBillPayment({
      choice: "partial",
      enteredPaidAmountCents: 4_000,
      paymentMode: "Cash",
      totalCents: 10_000,
    })).toEqual({ paidAmountCents: 4_000, paymentMode: "Cash" });

    expect(() => resolveBillPayment({
      choice: "partial",
      enteredPaidAmountCents: 10_000,
      paymentMode: "Cash",
      totalCents: 10_000,
    })).toThrow("less than the bill total");
  });
});
