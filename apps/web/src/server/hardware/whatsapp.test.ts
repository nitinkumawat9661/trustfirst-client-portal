import { describe, expect, it } from "vitest";
import { buildWhatsAppBillUrl, sanitizeWhatsAppNumber } from "./whatsapp";

describe("hardware WhatsApp sharing", () => {
  it("sanitizes local and country-code mobile numbers", () => {
    expect(sanitizeWhatsAppNumber("98765 43210")).toBe("919876543210");
    expect(sanitizeWhatsAppNumber("+91-98765-43210")).toBe("919876543210");
    expect(sanitizeWhatsAppNumber("123")).toBeNull();
  });

  it("generates a wa.me URL without claiming delivery", () => {
    const url = buildWhatsAppBillUrl({
      balanceCents: 1000,
      firmName: "Mangalam Sanitary",
      invoiceNumber: "HSO-2026-0001",
      mobile: "9876543210",
      paidCents: 4000,
      totalCents: 5000,
    });
    expect(url).toContain("https://wa.me/919876543210");
    expect(decodeURIComponent(url ?? "")).toContain("Balance: ₹10.00");
  });
});
