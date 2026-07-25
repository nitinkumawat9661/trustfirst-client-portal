import {
  CommercialDocumentStatus,
  CommercialDocumentType,
  type PrismaClient,
} from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";
import { findPublicMangalamReceipt } from "./public-receipt-lookup";

describe("public Mangalam receipt lookup", () => {
  it("uses an exact approved receipt lookup", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      documentNumber: "MS/REC/2026-27/00001",
      receiptPayments: [
        {
          amountCents: 40_000,
          invoice: {
            currency: "INR",
            invoiceNumber: "MS/INV/2026-27/00001",
            paidAmountCents: 40_000,
            status: "PARTIALLY_PAID",
            title: "Portal invoice",
            totalAmountCents: 100_000,
          },
          mode: "BANK_TRANSFER",
          receivedAt: new Date("2026-07-25T10:30:00.000Z"),
          reference: "BANK-REF-1",
        },
      ],
    });

    const result = await findPublicMangalamReceipt(
      {
        commercialDocument: {
          findFirst,
        },
      } as unknown as PrismaClient,
      "  MS/REC/2026-27/00001  ",
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          documentNumber: "MS/REC/2026-27/00001",
          status: CommercialDocumentStatus.APPROVED,
          tenant: {
            slug: "manglam-trading-demo",
          },
          type: CommercialDocumentType.RECEIPT,
        },
      }),
    );

    expect(result).toMatchObject({
      amountCents: 40_000,
      invoiceNumber: "MS/INV/2026-27/00001",
      receiptNumber: "MS/REC/2026-27/00001",
    });
  });

  it("returns null without querying for an empty number", async () => {
    const findFirst = vi.fn();

    const result = await findPublicMangalamReceipt(
      {
        commercialDocument: {
          findFirst,
        },
      } as unknown as PrismaClient,
      "   ",
    );

    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns null when no approved receipt matches", async () => {
    const result = await findPublicMangalamReceipt(
      {
        commercialDocument: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      } as unknown as PrismaClient,
      "MS/REC/2026-27/99999",
    );

    expect(result).toBeNull();
  });
});