import { AsyncLocalStorage } from "node:async_hooks";

export type OfflineQuickPosNumbering = {
  invoice: {
    financialYear: string;
    invoiceNumber: string;
    prefix: string;
    value: number;
  };
  tenantId: string;
  trade: {
    documentNumber: string;
    financialYear: string;
    prefix: string;
    value: number;
  };
};

const numberContext = new AsyncLocalStorage<OfflineQuickPosNumbering>();

export function runWithOfflineQuickPosNumbers<T>(
  numbering: OfflineQuickPosNumbering,
  callback: () => Promise<T>,
) {
  validateNumbering(numbering);
  return numberContext.run(numbering, callback);
}

export function offlineQuickPosInvoiceNumber(input: {
  financialYear: string;
  prefix: string;
  tenantId: string;
}) {
  const current = numberContext.getStore();
  if (
    !current ||
    current.tenantId !== input.tenantId ||
    current.invoice.financialYear !== input.financialYear ||
    normalizePrefix(current.invoice.prefix) !== normalizePrefix(input.prefix)
  ) {
    return null;
  }
  return current.invoice.invoiceNumber;
}

export function offlineQuickPosTradeSequence(input: {
  financialYear: string;
  prefix: string;
  tenantId: string;
}) {
  const current = numberContext.getStore();
  if (
    !current ||
    current.tenantId !== input.tenantId ||
    current.trade.financialYear !== input.financialYear ||
    current.trade.prefix !== input.prefix
  ) {
    return null;
  }
  return {
    documentNumber: current.trade.documentNumber,
    value: current.trade.value,
  };
}

export function isOfflineQuickPosTradeNumber(input: {
  documentNumber: string;
  tenantId: string;
}) {
  const current = numberContext.getStore();
  return Boolean(
    current &&
    current.tenantId === input.tenantId &&
    current.trade.documentNumber === input.documentNumber,
  );
}

function validateNumbering(numbering: OfflineQuickPosNumbering) {
  if (!numbering.tenantId.trim()) throw new Error("Offline number tenant is required.");
  if (!Number.isSafeInteger(numbering.trade.value) || numbering.trade.value <= 0) {
    throw new Error("Offline trade number value is invalid.");
  }
  if (!Number.isSafeInteger(numbering.invoice.value) || numbering.invoice.value <= 0) {
    throw new Error("Offline invoice number value is invalid.");
  }
  const expectedTrade = `${numbering.trade.prefix}-${numbering.trade.financialYear}-${String(numbering.trade.value).padStart(4, "0")}`;
  const expectedInvoice = `${normalizePrefix(numbering.invoice.prefix)}/${numbering.invoice.financialYear}/${String(numbering.invoice.value).padStart(5, "0")}`;
  if (numbering.trade.documentNumber !== expectedTrade) {
    throw new Error("Offline trade number does not match its sequence value.");
  }
  if (numbering.invoice.invoiceNumber !== expectedInvoice) {
    throw new Error("Offline invoice number does not match its sequence value.");
  }
}

function normalizePrefix(prefix: string) {
  return prefix.trim().replace(/\/+$/u, "");
}
