import { z } from "zod";

export const hardwareDayClosingCloseSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).optional(),
  countedCashCents: z.number().int().nonnegative(),
  notes: z.string().trim().max(1000).optional(),
  openingCashCents: z.number().int().nonnegative().default(0),
});

export const hardwareDayClosingReopenSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export type HardwareDayClosingCloseInput = z.infer<typeof hardwareDayClosingCloseSchema>;
export type HardwareDayClosingReopenInput = z.infer<typeof hardwareDayClosingReopenSchema>;
