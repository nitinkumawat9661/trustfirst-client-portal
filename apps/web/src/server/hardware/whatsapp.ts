export type WhatsAppBillMessageInput = {
  balanceCents: number;
  firmName: string;
  invoiceNumber: string;
  mobile: string;
  paidCents: number;
  receiptUrl?: string | null;
  totalCents: number;
};

export function sanitizeWhatsAppNumber(input: string, defaultCountryCode = "91") {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  const withoutLeadingZero = digits.replace(/^0+/, "");
  const withCountry = withoutLeadingZero.length === 10 ? `${defaultCountryCode}${withoutLeadingZero}` : withoutLeadingZero;
  return withCountry.length >= 11 && withCountry.length <= 15 ? withCountry : null;
}

export function buildWhatsAppBillUrl(input: WhatsAppBillMessageInput) {
  const number = sanitizeWhatsAppNumber(input.mobile);
  if (!number) return null;
  const lines = [
    `${input.firmName}`,
    `Bill: ${input.invoiceNumber}`,
    `Total: ${money(input.totalCents)}`,
    `Paid: ${money(input.paidCents)}`,
    `Balance: ${money(input.balanceCents)}`,
    input.receiptUrl ? `Receipt: ${input.receiptUrl}` : null,
  ].filter(Boolean);
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function money(amountCents: number) {
  return new Intl.NumberFormat("en-IN", { currency: "INR", style: "currency" }).format(amountCents / 100);
}
