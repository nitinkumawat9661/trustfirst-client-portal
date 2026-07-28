import { HardwareInventoryMovementType } from "@trustfirst/database";
import { z } from "zod";

const jsonRecord = z.record(z.string(), z.unknown());
const gstTaxConfigSchema = jsonRecord.superRefine((value, context) => {
  const rate = value.rateBps;
  if (rate === undefined) return;
  if (typeof rate !== "number" || !Number.isInteger(rate) || rate < 0 || rate > 10_000) {
    context.addIssue({
      code: "custom",
      message: "GST rate must be between 0 and 10000 basis points.",
      path: ["rateBps"],
    });
  }
});

export const hardwareCategorySchema = z.object({
  description: z.string().max(1000).optional(),
  metadata: jsonRecord.optional(),
  name: z.string().min(2).max(160),
});

export const hardwareBrandSchema = z.object({
  metadata: jsonRecord.optional(),
  name: z.string().min(2).max(160),
});

export const hardwareUnitSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  precision: z.number().int().min(0).max(4).optional(),
});

export const hardwareProductSchema = z.object({
  barcode: z.string().max(120).optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().max(5000).optional(),
  gstTaxConfig: gstTaxConfigSchema.optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  metadata: jsonRecord.optional(),
  name: z.string().trim().min(1, "Product name is required.").max(240),
  purchaseCostCents: z.number().int().nonnegative().optional(),
  salesPriceCents: z.number().int().nonnegative().optional(),
  sku: z.string().min(1).max(120).optional(),
  unitId: z.string().optional(),
}).superRefine((value, context) => {
  if (!value.salesPriceCents || value.salesPriceCents <= 0) {
    context.addIssue({
      code: "custom",
      message: "Sale price is required and must be greater than zero.",
      path: ["salesPriceCents"],
    });
  }
});

export const quickHardwareProductSchema = z.object({
  barcode: z.string().max(120).optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  gstRateBps: z.number().int().min(0).max(10_000).optional(),
  hsnCode: z.string().regex(/^[0-9A-Za-z-]{2,12}$/u, "HSN must be 2 to 12 letters, digits, or dashes.").optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  name: z.string().trim().min(2).max(240),
  openingStock: z.object({
    locationId: z.string(),
    quantity: z.number().int().nonnegative(),
  }).optional(),
  purchaseCostCents: z.number().int().nonnegative().optional(),
  salesPriceCents: z.number().int().nonnegative().optional(),
  sku: z.string().min(1).max(120).optional(),
  unitId: z.string().optional(),
});

export const quickHardwarePartySchema = z.object({
  address: z.string().max(500).optional(),
  balanceDirection: z.enum(["DR", "CR"]).optional(),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/u, "GSTIN must be 15 uppercase letters or digits.").optional(),
  mobile: z.string().max(30).optional(),
  name: z.string().trim().min(2).max(240),
  openingBalanceCents: z.number().int().nonnegative().optional(),
  role: z.enum(["customer", "supplier"]),
}).superRefine((value, context) => {
  if ((value.openingBalanceCents ?? 0) > 0 && !value.balanceDirection) {
    context.addIssue({
      code: "custom",
      message: "Opening balance direction is required when an opening balance is provided.",
      path: ["balanceDirection"],
    });
  }
});

export const hardwareLocationSchema = z.object({
  address: jsonRecord.optional(),
  code: z.string().min(1).max(40),
  metadata: jsonRecord.optional(),
  name: z.string().min(2).max(160),
});

export const hardwareMovementSchema = z.object({
  customerId: z.string().optional(),
  locationId: z.string(),
  metadata: jsonRecord.optional(),
  notes: z.string().max(2000).optional(),
  occurredAt: z.coerce.date().optional(),
  productId: z.string(),
  quantity: z.number().int().nonnegative(),
  referenceId: z.string().max(160).optional(),
  referenceType: z.string().max(80).optional(),
  supplierId: z.string().optional(),
  type: z.nativeEnum(HardwareInventoryMovementType),
  unitCostCents: z.number().int().nonnegative().optional(),
  unitPriceCents: z.number().int().nonnegative().optional(),
}).superRefine((value, context) => {
  if (value.type !== HardwareInventoryMovementType.ADJUSTMENT && value.quantity === 0) {
    context.addIssue({
      code: "custom",
      message: "Stock in and stock out quantities must be greater than zero.",
      path: ["quantity"],
    });
  }
});

export const hardwareImportPreviewSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(500),
  dryRun: z.boolean().optional(),
  importId: z.string().max(120).optional(),
  mode: z.enum(["create", "update", "upsert"]).default("create"),
});

export const hardwareImportExecuteSchema = hardwareImportPreviewSchema.extend({
  duplicateMode: z.enum(["reject", "skip"]).default("reject"),
  dryRun: z.boolean().default(false),
  idempotencyKey: z.string().min(12).max(120).optional(),
});

export const hardwareBusinessSettingsSchema = z.object({
  address: jsonRecord.optional(),
  defaultGstMode: z.enum(["inclusive", "exclusive", "none"]).optional(),
  defaultStockLocationId: z.string().optional(),
  email: z.string().email().optional(),
  financialYear: z.string().min(4).max(20),
  firmName: z.string().min(2).max(240),
  gstin: z.string().max(20).optional(),
  invoicePrefix: z.string().min(1).max(20).optional(),
  logoPlaceholder: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
  roundOffEnabled: z.boolean().optional(),
  termsFooter: z.string().max(1000).optional(),
});

export const hardwareSearchSchema = z.object({
  q: z.string().min(1).max(120),
});

export type HardwareCategoryInput = z.infer<typeof hardwareCategorySchema>;
export type HardwareBrandInput = z.infer<typeof hardwareBrandSchema>;
export type HardwareUnitInput = z.infer<typeof hardwareUnitSchema>;
export type HardwareProductInput = z.infer<typeof hardwareProductSchema>;
export type QuickHardwareProductInput = z.infer<typeof quickHardwareProductSchema>;
export type QuickHardwarePartyInput = z.infer<typeof quickHardwarePartySchema>;
export type HardwareLocationInput = z.infer<typeof hardwareLocationSchema>;
export type HardwareMovementInput = z.infer<typeof hardwareMovementSchema>;
export type HardwareImportPreviewInput = z.infer<typeof hardwareImportPreviewSchema>;
export type HardwareImportExecuteInput = z.infer<typeof hardwareImportExecuteSchema>;
export type HardwareBusinessSettingsInput = z.infer<typeof hardwareBusinessSettingsSchema>;
