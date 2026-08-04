import type { QueuedMutation } from "./types";

export type QueueEndpointContract = {
  body: Record<string, unknown>;
  method: "POST";
  path: string;
  requiresDeviceAuth?: boolean;
};

export function endpointForQueuedMutation(item: QueuedMutation): QueueEndpointContract {
  switch (item.action) {
    case "hardware.tradeDraft.create":
    case "hardware.quickPosSale.create":
    case "hardware.partyDraft.create":
    case "hardware.productDraft.create":
    case "hardware.stockAdjustmentDraft.create":
      return { body: { item }, method: "POST", path: "/api/offline/sync", requiresDeviceAuth: true };
    case "hardware.saleDraft.create":
      return { body: item.payload, method: "POST", path: "/api/hardware/sales" };
    case "hardware.purchaseDraft.create":
      return { body: item.payload, method: "POST", path: "/api/hardware/purchases" };
    case "hardware.customerDraft.create":
      return { body: item.payload, method: "POST", path: "/api/crm/clients" };
    case "hardware.manualPaymentDraft.create": {
      const invoiceId = item.payload.invoiceId;
      if (typeof invoiceId !== "string" || !invoiceId) {
        throw new Error("Manual payment sync requires an invoiceId.");
      }
      const body = { ...item.payload };
      delete body.invoiceId;
      return { body, method: "POST", path: `/api/billing/invoices/${encodeURIComponent(invoiceId)}/payments` };
    }
  }
}
