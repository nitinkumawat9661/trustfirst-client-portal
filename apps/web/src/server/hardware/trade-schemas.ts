import { HardwareTradeDocumentType } from "@trustfirst/database";
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

export const hardwareTradeStatusSchema = z.object({
  locationId: z.string(),
});

export type HardwareTradeItemInput = z.infer<typeof hardwareTradeItemSchema>;
export type HardwareTradeDocumentInput = z.infer<typeof hardwareTradeDocumentSchema>;
export type HardwareTradeStatusInput = z.infer<typeof hardwareTradeStatusSchema>;
