import { PaymentMode } from "@trustfirst/database";
import { z } from "zod";

export const hardwareFinancialAllocationSchema = z.object({
  amountCents: z.number().int().positive(),
  targetTransactionId: z.string().min(1),
});

export const hardwarePartyPaymentSchema = z.object({
  allocations: z.array(hardwareFinancialAllocationSchema).default([]),
  amountCents: z.number().int().positive(),
  excessAsAdvance: z.boolean().default(false),
  idempotencyKey: z.string().min(12).max(120),
  mode: z.nativeEnum(PaymentMode),
  notes: z.string().trim().max(1000).optional(),
  partyId: z.string().min(1),
  reference: z.string().trim().max(120).optional(),
});

export const hardwarePaymentReversalSchema = z.object({
  confirm: z.literal(true),
  idempotencyKey: z.string().min(12).max(120),
  reason: z.string().trim().min(3).max(1000),
});

export const hardwareCustomerRefundSchema = z.object({
  amountCents: z.number().int().positive(),
  idempotencyKey: z.string().min(12).max(120),
  mode: z.nativeEnum(PaymentMode),
  notes: z.string().trim().max(1000).optional(),
  partyId: z.string().min(1),
  reference: z.string().trim().max(120).optional(),
});

export const hardwareFinancialAdjustmentSchema = z.object({
  amountCents: z.number().int().positive(),
  direction: z.enum(["debit", "credit"]),
  effectiveDate: z.string().datetime().optional(),
  idempotencyKey: z.string().min(12).max(120),
  notes: z.string().trim().max(1000).optional(),
  partyId: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
  reference: z.string().trim().max(120).optional(),
  role: z.enum(["customer", "supplier"]),
});

export const hardwareFinancialAdjustmentCorrectionSchema = z.object({
  amountCents: z.number().int().positive(),
  confirm: z.literal(true),
  direction: z.enum(["debit", "credit"]),
  effectiveDate: z.string().datetime().optional(),
  idempotencyKey: z.string().min(12).max(120),
  notes: z.string().trim().max(1000).optional(),
  reason: z.string().trim().min(3).max(1000),
  reference: z.string().trim().max(120).optional(),
});

export const hardwareFinancialAdjustmentReversalSchema = z.object({
  confirm: z.literal(true),
  idempotencyKey: z.string().min(12).max(120),
  reason: z.string().trim().min(3).max(1000),
});

export type HardwareFinancialAllocationInput = z.infer<typeof hardwareFinancialAllocationSchema>;
export type HardwarePartyPaymentInput = z.infer<typeof hardwarePartyPaymentSchema>;
export type HardwarePaymentReversalInput = z.infer<typeof hardwarePaymentReversalSchema>;
export type HardwareCustomerRefundInput = z.infer<typeof hardwareCustomerRefundSchema>;
export type HardwareFinancialAdjustmentInput = z.infer<typeof hardwareFinancialAdjustmentSchema>;
export type HardwareFinancialAdjustmentCorrectionInput = z.infer<typeof hardwareFinancialAdjustmentCorrectionSchema>;
export type HardwareFinancialAdjustmentReversalInput = z.infer<typeof hardwareFinancialAdjustmentReversalSchema>;
