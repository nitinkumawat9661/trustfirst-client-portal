import { describe, expect, it } from "vitest";
import {
  isOfflineQuickPosTradeNumber,
  offlineQuickPosInvoiceNumber,
  offlineQuickPosTradeSequence,
  runWithOfflineQuickPosNumbers,
} from "./offline-number-context";

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

describe("offline Quick POS number context", () => {
  it("exposes reserved invoice and trade numbers only inside the active request", async () => {
    await runWithOfflineQuickPosNumbers(numbering, async () => {
      expect(offlineQuickPosInvoiceNumber({
        financialYear: "2026-27",
        prefix: "MS/INV/",
        tenantId: "tenant_1",
      })).toBe("MS/INV/2026-27/00301");
      expect(offlineQuickPosTradeSequence({
        financialYear: "2026",
        prefix: "HSO",
        tenantId: "tenant_1",
      })).toEqual({ documentNumber: "HSO-2026-0201", value: 201 });
      expect(isOfflineQuickPosTradeNumber({
        documentNumber: "HSO-2026-0201",
        tenantId: "tenant_1",
      })).toBe(true);
      expect(offlineQuickPosTradeSequence({
        financialYear: "2026",
        prefix: "HSO",
        tenantId: "tenant_2",
      })).toBeNull();
    });

    expect(offlineQuickPosInvoiceNumber({
      financialYear: "2026-27",
      prefix: "MS/INV",
      tenantId: "tenant_1",
    })).toBeNull();
  });

  it("rejects numbers that do not match their sequence values", () => {
    expect(() => runWithOfflineQuickPosNumbers({
      ...numbering,
      trade: { ...numbering.trade, documentNumber: "HSO-2026-9999" },
    }, async () => undefined)).toThrow("does not match its sequence value");
  });
});
