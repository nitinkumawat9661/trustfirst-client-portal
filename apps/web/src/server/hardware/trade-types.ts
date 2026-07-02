import type { HardwareTradeDocumentStatus, HardwareTradeDocumentType } from "@trustfirst/database";

export type HardwareTradeTotals = {
  discountCents: number;
  roundOffCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type HardwareTradeSummary = HardwareTradeTotals & {
  customerId: string | null;
  documentNumber: string;
  id: string;
  paymentStatus: string;
  status: HardwareTradeDocumentStatus;
  supplierId: string | null;
  type: HardwareTradeDocumentType;
  updatedAt: Date;
};

export type HardwareReportSummary = {
  dailySalesCents: number;
  lowStockProducts: number;
  outstandingCustomersCents: number;
  outstandingSuppliersCents: number;
  purchaseSummaryCents: number;
  stockMovements: number;
};

export type HardwarePrintContract = {
  documentId: string;
  format: "a4";
  renderer: "pdf";
  templateKey: "hardware-trade-a4-v1";
};

export type HardwareWhatsAppShareContract = {
  channel: "whatsapp";
  liveIntegration: false;
  messageTemplate: string;
};

export type HardwarePrintProjection = {
  customer: {
    name: string;
  } | null;
  document: HardwareTradeSummary & {
    totalsInWords: string;
  };
  firm: {
    address: Record<string, unknown>;
    email: string | null;
    firmName: string;
    gstin: string | null;
    logoPlaceholder: string | null;
    phone: string | null;
    termsFooter: string | null;
  };
  gstSummary: Array<{ taxableCents: number; taxCents: number; taxRateBps: number }>;
  items: Array<{
    description: string;
    discountCents: number;
    lineTotalCents: number;
    quantity: number;
    taxCents: number;
    taxRateBps: number;
    unitAmountCents: number;
  }>;
  printContract: HardwarePrintContract;
  signatureLabel: string;
};
