export type BillPaymentChoice = "" | "paid" | "partial" | "unpaid";

export type ResolvedBillPayment = {
  paidAmountCents: number;
  paymentMode: string;
};

export function resolveBillPayment(input: {
  choice: BillPaymentChoice;
  enteredPaidAmountCents: number | null;
  paymentMode: string;
  totalCents: number;
}): ResolvedBillPayment {
  if (!Number.isInteger(input.totalCents) || input.totalCents < 0) {
    throw new Error("Bill total is invalid.");
  }
  if (!input.choice) {
    throw new Error("Select whether this bill is paid or unpaid before generating it.");
  }
  if (input.choice === "unpaid") {
    return { paidAmountCents: 0, paymentMode: "Credit" };
  }
  const paymentMode = input.paymentMode.trim();
  if (!paymentMode || paymentMode === "Credit") {
    throw new Error("Select a payment mode for a paid bill.");
  }
  if (input.choice === "paid") {
    return { paidAmountCents: input.totalCents, paymentMode };
  }
  const paidAmountCents = input.enteredPaidAmountCents;
  if (
    paidAmountCents === null
    || !Number.isInteger(paidAmountCents)
    || paidAmountCents <= 0
    || paidAmountCents >= input.totalCents
  ) {
    throw new Error("Partial paid amount must be greater than zero and less than the bill total.");
  }
  return { paidAmountCents, paymentMode };
}
