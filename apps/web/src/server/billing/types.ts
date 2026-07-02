import type { BillingTimelineVerb, InvoiceStatus, PaymentMode, PaymentProvider } from "@trustfirst/database";

export type InvoiceSummary = {
  clientId: string | null;
  dueAt: Date | null;
  invoiceNumber: string;
  outstandingAmountCents: number;
  paidAmountCents: number;
  status: InvoiceStatus;
  title: string;
  totalAmountCents: number;
  id: string;
  updatedAt: Date;
};

export type InvoiceWorkspace = InvoiceSummary & {
  attachments: Array<{ id: string; name: string }>;
  comments: Array<{ body: string; id: string; parentId: string | null }>;
  lineItems: unknown[];
  payments: Array<{
    amountCents: number;
    id: string;
    mode: PaymentMode;
    provider: PaymentProvider;
    receivedAt: Date;
  }>;
  pdfContract: InvoicePdfRenderContract;
  timeline: Array<{ id: string; occurredAt: Date; summary: string; verb: BillingTimelineVerb }>;
};

export type BillingDashboard = {
  draftInvoices: number;
  overdueInvoices: number;
  outstandingAmountCents: number;
  paidAmountCents: number;
  totalInvoices: number;
};

export type InvoiceCsvExportContract = {
  columns: string[];
  filename: string;
  format: "csv";
  rows: Array<Record<string, string>>;
};

export type InvoicePdfRenderContract = {
  engine: "pdf";
  invoiceId: string;
  payload: Record<string, unknown>;
  templateKey: "invoice-standard-v1";
};

export type PaymentProviderContract = {
  capabilities: Array<"create_intent" | "verify_payment" | "refund_reference" | "manual_record">;
  key: "razorpay" | "stripe" | "phonepe" | "upi_qr" | "manual";
  liveIntegration: false;
  name: string;
};
