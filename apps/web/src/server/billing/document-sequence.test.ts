import { DocumentSequenceKind, type Prisma } from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";
import {
  allocateDocumentNumber,
  financialYearForDate,
} from "./document-sequence";

describe("document sequence", () => {
  it("uses the Indian financial year boundary", () => {
    expect(financialYearForDate(new Date("2026-04-01T00:00:00.000Z"))).toBe(
      "2026-27",
    );
    expect(financialYearForDate(new Date("2027-03-31T23:59:59.999Z"))).toBe(
      "2026-27",
    );
    expect(financialYearForDate(new Date("2027-04-01T00:00:00.000Z"))).toBe(
      "2027-28",
    );
  });

  it("allocates an invoice number through the atomic sequence upsert", async () => {
    const upsert = vi.fn().mockResolvedValue({ lastValue: 1 });

    const tx = {
      documentSequence: {
        upsert,
      },
    } as unknown as Prisma.TransactionClient;

    const number = await allocateDocumentNumber(tx, {
      kind: DocumentSequenceKind.INVOICE,
      occurredAt: new Date("2026-07-25T00:00:00.000Z"),
      prefix: "MS/INV",
      tenantId: "tenant_1",
    });

    expect(number).toBe("MS/INV/2026-27/00001");
    expect(upsert).toHaveBeenCalledWith({
      create: {
        financialYear: "2026-27",
        kind: DocumentSequenceKind.INVOICE,
        lastValue: 1,
        tenantId: "tenant_1",
      },
      select: {
        lastValue: true,
      },
      update: {
        lastValue: {
          increment: 1,
        },
      },
      where: {
        tenantId_kind_financialYear: {
          financialYear: "2026-27",
          kind: DocumentSequenceKind.INVOICE,
          tenantId: "tenant_1",
        },
      },
    });
  });

  it("normalizes a trailing receipt prefix slash", async () => {
    const tx = {
      documentSequence: {
        upsert: vi.fn().mockResolvedValue({ lastValue: 12 }),
      },
    } as unknown as Prisma.TransactionClient;

    const number = await allocateDocumentNumber(tx, {
      financialYear: "2026-27",
      kind: DocumentSequenceKind.RECEIPT,
      prefix: "MS/REC/",
      tenantId: "tenant_1",
    });

    expect(number).toBe("MS/REC/2026-27/00012");
  });
});