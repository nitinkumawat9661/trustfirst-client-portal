import { HardwareTradeDocumentType, PaymentMode } from "@trustfirst/database";
import { z } from "zod";

const jsonRecord = z.record(z.string(), z.unknown());

export const hardwareTradeItemSchema = z.object({
  discountCents: z.number().int().nonnegative().optional(),
  metadata: jsonRecord.optional(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
  unitAmountCents: z.number().int().nonnegative(),
});

export const hardwareTradeDocumentSchema = z.object({
  billingInvoiceId: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  customerId: z.string().optional(),
  items: z.array(hardwareTradeItemSchema).min(1),
  metadata: jsonRecord.optional(),
  projectId: z.string().optional(),
  requirementId: z.string().optional(),
  roundOffCents: z.number().int().optional(),
  supplierId: z.string().optional(),
  type: z.nativeEnum(HardwareTradeDocumentType),
});

export const hardwareSalesDocumentSchema = hardwareTradeDocumentSchema.refine(
  (value) =>
    value.type === HardwareTradeDocumentType.SALES_ORDER ||
    value.type === HardwareTradeDocumentType.SALES_QUOTATION ||
    value.type === HardwareTradeDocumentType.SALE_RETURN,
  { message: "Sales API accepts only sales documents.", path: ["type"] },
);

export const hardwarePurchaseDocumentSchema = hardwareTradeDocumentSchema.refine(
  (value) =>
    value.type === HardwareTradeDocumentType.PURCHASE_ENTRY ||
    value.type === HardwareTradeDocumentType.PURCHASE_ORDER ||
    value.type === HardwareTradeDocumentType.PURCHASE_RETURN ||
    value.type === HardwareTradeDocumentType.SUPPLIER_BILL,
  { message: "Purchase API accepts only purchase documents.", path: ["type"] },
);

export const hardwareTradeStatusSchema = z.object({
  locationId: z.string().optional(),
});

export const hardwareEstimateUpdateSchema = hardwareTradeDocumentSchema.extend({
  idempotencyKey: z.string().min(12).max(120),
  locationId: z.string(),
}).refine(
  (value) => value.type === HardwareTradeDocumentType.SALES_QUOTATION,
  { message: "Estimate edit accepts only Estimate Bills.", path: ["type"] },
);

export const hardwareBillUpdateSchema = hardwareTradeDocumentSchema.extend({
  idempotencyKey: z.string().min(12).max(120),
  invoiceDiscountCents: z.number().int().nonnegative().default(0),
  locationId: z.string().min(1),
  paidAmountCents: z.number().int().nonnegative(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  reason: z.string().trim().min(3).max(1000),
}).refine(
  (value) => ([
    HardwareTradeDocumentType.SALES_ORDER,
    HardwareTradeDocumentType.SALES_QUOTATION,
    HardwareTradeDocumentType.PURCHASE_ENTRY,
    HardwareTradeDocumentType.SUPPLIER_BILL,
  ] as HardwareTradeDocumentType[]).includes(value.type),
  { message: "Only Sales, Purchase, Supplier, and Estimate Bills can be edited.", path: ["type"] },
);

export const hardwareTradeCancelSchema = z.object({
  confirm: z.literal(true),
  idempotencyKey: z.string().min(12).max(120),
  locationId: z.string().optional(),
  reason: z.string().trim().min(3).max(1000),
});

export const hardwareSaleReturnSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  items: z.array(z.object({
    originalItemId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  locationId: z.string(),
  reason: z.string().trim().min(3).max(1000),
  refundMode: z.nativeEnum(PaymentMode).optional(),
  refundReference: z.string().trim().max(120).optional(),
  refundType: z.enum(["cash_refund", "payment_refund", "customer_credit"]).default("customer_credit"),
});

export const hardwarePurchaseReturnSchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  items: z.array(z.object({
    originalItemId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  locationId: z.string(),
  reason: z.string().trim().min(3).max(1000),
  settlementReference: z.string().trim().max(120).optional(),
  settlementType: z.enum(["supplier_credit", "refund_received"]).default("supplier_credit"),
});

export const quickPosSaleSchema = z.object({
  clientTotalCents: z.number().int().nonnegative(),
  customerAddress: z.string().trim().max(1000).optional(),
  customerId: z.string().optional(),
  idempotencyKey: z.string().min(12).max(120),
  invoiceDiscountCents: z.number().int().nonnegative().optional(),
  items: z.array(hardwareTradeItemSchema).min(1),
  locationId: z.string(),
  notes: z.string().max(1000).optional(),
  paidAmountCents: z.number().int().nonnegative().default(0),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  roundOffCents: z.number().int().optional(),
  taxMode: z.enum(["intra-state", "inter-state"]).default("intra-state"),
});

export type HardwareTradeItemInput = z.infer<typeof hardwareTradeItemSchema>;
export type HardwareTradeDocumentInput = z.infer<typeof hardwareTradeDocumentSchema>;
export type HardwareTradeStatusInput = z.infer<typeof hardwareTradeStatusSchema>;
export type HardwareEstimateUpdateInput = z.infer<typeof hardwareEstimateUpdateSchema>;
export type HardwareBillUpdateInput = z.infer<typeof hardwareBillUpdateSchema>;
export type HardwareTradeCancelInput = z.infer<typeof hardwareTradeCancelSchema>;
export type HardwareSaleReturnInput = z.infer<typeof hardwareSaleReturnSchema>;
export type HardwarePurchaseReturnInput = z.infer<typeof hardwarePurchaseReturnSchema>;
export type QuickPosSaleInput = z.infer<typeof quickPosSaleSchema>;
