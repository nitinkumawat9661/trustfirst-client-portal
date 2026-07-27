import type { HardwareTradeDocumentStatus, HardwareTradeDocumentType } from "@trustfirst/database";

export type HardwareTradeTotals = {
  discountCents: number;
  roundOffCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type HardwareTradeSummary = HardwareTradeTotals & {
  billingInvoiceId: string | null;
  createdAt: Date;
  customerId: string | null;
  customerName: string | null;
  documentNumber: string;
  id: string;
  metadata: Record<string, unknown>;
  paymentStatus: string;
  status: HardwareTradeDocumentStatus;
  supplierId: string | null;
  supplierName: string | null;
  type: HardwareTradeDocumentType;
  updatedAt: Date;
};

export type HardwareReportSummary = {
  dailySalesCents: number;
  lowStockProducts: number;
  outstandingCustomersCents: number;
  outstandingSuppliersCents: number;
  purchaseGstCents: number;
  purchaseSummaryCents: number;
  salesGstCents: number;
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

export type HardwareReturnOptions = {
  documentId: string;
  documentNumber: string;
  documentType: HardwareTradeDocumentType;
  partyName: string | null;
  remainingItems: Array<{
    description: string;
    originalItemId: string;
    previouslyReturnedQuantity: number;
    purchasedOrSoldQuantity: number;
    remainingQuantity: number;
    unitAmountCents: number;
  }>;
};

export type HardwarePrintProjection = {
  customer: {
    address: string | null;
    gstin: string | null;
    name: string;
    phone: string | null;
  } | null;
  document: HardwareTradeSummary & {
    totalsInWords: string;
  };
  firm: {
    address: Record<string, unknown>;
    email: string | null;
    firmName: string;
    gstin: string | null;
    legalName: string | null;
    logoUrl: string | null;
    logoPlaceholder: string | null;
    phone: string | null;
    proprietorName: string | null;
    tagline: string | null;
    termsFooter: string | null;
  };
  gstSummary: Array<{ taxableCents: number; taxCents: number; taxRateBps: number }>;
  items: Array<{
    cgstCents: number;
    description: string;
    discountCents: number;
    discountFlatCents: number | null;
    discountPercent: number | null;
    discountType: string | null;
    discountValue: number | null;
    hsnCode: string | null;
    igstCents: number;
    lineTotalCents: number;
    productGstRateBps: number | null;
    quantity: number;
    sgstCents: number;
    taxCents: number;
    taxRateBps: number;
    taxableCents: number;
    unitCode: string | null;
    unitAmountCents: number;
  }>;
  printContract: HardwarePrintContract;
  signatureLabel: string;
};
