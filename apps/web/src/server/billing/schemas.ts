import { InvoiceStatus, PaymentMode, PaymentProvider } from "@trustfirst/database";
import { z } from "zod";

const jsonRecord = z.record(z.string(), z.unknown());

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  totalAmountCents: z.number().int().nonnegative(),
  unitAmountCents: z.number().int().nonnegative(),
});

export const paymentTermsSchema = z.object({
  daysUntilDue: z.number().int().min(0).max(365).optional(),
  label: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export const billingProfileSchema = z.object({
  address: jsonRecord.optional(),
  billingEmail: z.string().email().optional(),
  clientId: z.string(),
  currency: z.string().min(3).max(3).optional(),
  legalName: z.string().min(2).max(240),
  metadata: jsonRecord.optional(),
  paymentTerms: paymentTermsSchema.optional(),
  taxIdentifier: z.string().max(80).optional(),
});

export const invoiceCreateSchema = z.object({
  branding: jsonRecord.optional(),
  clientId: z.string().optional(),
  commercialDocumentId: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  dueAt: z.coerce.date().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1),
  metadata: jsonRecord.optional(),
  paymentTerms: paymentTermsSchema.optional(),
  projectId: z.string().optional(),
  requirementId: z.string().optional(),
  summary: z.string().max(5000).optional(),
  title: z.string().min(3).max(240),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const invoiceStatusSchema = z.object({
  reason: z.string().max(1000).optional(),
  status: z.enum([InvoiceStatus.ISSUED, InvoiceStatus.VOID, InvoiceStatus.ARCHIVED]),
});

export const paymentRecordSchema = z.object({
  amountCents: z.number().int().positive(),
  metadata: jsonRecord.optional(),
  mode: z.nativeEnum(PaymentMode),
  notes: z.string().max(2000).optional(),
  provider: z.nativeEnum(PaymentProvider).default(PaymentProvider.MANUAL),
  receiptDocumentId: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  reference: z.string().max(160).optional(),
});

export const invoiceCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional(),
  parentId: z.string().optional(),
});

export const invoiceAttachmentSchema = z.object({
  mimeType: z.string().min(1).max(120),
  name: z.string().min(1).max(240),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
});

export type BillingProfileInput = z.infer<typeof billingProfileSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceStatusInput = z.infer<typeof invoiceStatusSchema>;
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
export type InvoiceCommentInput = z.infer<typeof invoiceCommentSchema>;
export type InvoiceAttachmentInput = z.infer<typeof invoiceAttachmentSchema>;
