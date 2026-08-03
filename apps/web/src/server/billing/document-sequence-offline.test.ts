import { DocumentSequenceKind, type Prisma } from "@trustfirst/database";
import { describe, expect, it, vi } from "vitest";
import { allocateDocumentNumber } from "./document-sequence";
import { runWithOfflineQuickPosNumbers } from "../offline/offline-number-context";

const numbering = {
  invoice: {
    financialYear: "2026-27",
    invoiceNumber: "MS/INV/2026-27/00301",
    prefix: "MS/INV",
    value: 301,
  },
  tenantId: "tenant_1",
  trade: {
    documentNumber: "HSO-2026-0201",
    financialYear: "2026",
    prefix: "HSO",
    value: 201,
  },
};

describe("offline invoice sequence allocation", () => {
  it("returns the verified reserved invoice without advancing the online sequence", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const upsert = vi.fn();
    const tx = {
      documentSequence: { upsert },
      invoice: { findFirst },
    } as unknown as Prisma.TransactionClient;

    const result = await runWithOfflineQuickPosNumbers(numbering, () => allocateDocumentNumber(tx, {
      financialYear: "2026-27",
      kind: DocumentSequenceKind.INVOICE,
      prefix: "MS/INV",
      tenantId: "tenant_1",
    }));

    expect(result).toBe("MS/INV/2026-27/00301");
    expect(findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: { invoiceNumber: "MS/INV/2026-27/00301", tenantId: "tenant_1" },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a reserved invoice number already used by another record", async () => {
    const tx = {
      documentSequence: { upsert: vi.fn() },
      invoice: { findFirst: vi.fn().mockResolvedValue({ id: "invoice_existing" }) },
    } as unknown as Prisma.TransactionClient;

    await expect(runWithOfflineQuickPosNumbers(numbering, () => allocateDocumentNumber(tx, {
      financialYear: "2026-27",
      kind: DocumentSequenceKind.INVOICE,
      prefix: "MS/INV",
      tenantId: "tenant_1",
    }))).rejects.toThrow("Reserved invoice number MS/INV/2026-27/00301 is already in use");
  });
});
