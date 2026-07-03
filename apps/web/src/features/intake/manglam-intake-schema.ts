import { z } from "zod";

const optionalText = z.string().trim().max(2000);
const optionalShortText = z.string().trim().max(240);
const optionalEmail = z
  .string()
  .trim()
  .max(240)
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Enter a valid email address.",
  });
const textArray = z.array(z.string().trim().min(1).max(120)).max(20);

export const manglamPublicIntakeSchema = z.object({
  access: z.object({
    languagePreference: z.enum(["english", "hindi", "both"]),
    offlineNeed: optionalText,
    rolesNeeded: textArray,
  }),
  business: z.object({
    address: z.string().trim().min(5, "Business address is required.").max(1000),
    businessType: optionalShortText,
    countersOrBranches: optionalShortText,
    gstin: optionalShortText,
    teamSize: optionalShortText,
  }),
  catalog: z.object({
    barcodeUsage: optionalText,
    brandHandling: optionalText,
    productCategories: textArray.min(1, "Select at least one product category."),
    skuNeeds: optionalText,
    unitTypes: textArray.min(1, "Select at least one unit type."),
  }),
  company: z.object({
    contactName: z.string().trim().min(2, "Contact name is required.").max(160),
    email: optionalEmail,
    firmName: z.string().trim().min(2, "Firm name is required.").max(180),
    phone: z.string().trim().min(8, "Phone number is required.").max(40),
    role: optionalShortText,
  }),
  inventory: z.object({
    godowns: optionalText,
    lowStockAlerts: optionalText,
    openingStockReadiness: optionalText,
    stockAdjustmentNeeds: optionalText,
    stockTracking: optionalText,
  }),
  notes: z.object({
    currentSoftware: optionalText,
    painPoints: z.string().trim().min(10, "Describe the main pain points.").max(2500),
    successCriteria: z.string().trim().min(10, "Describe what a successful demo should prove.").max(2500),
    targetDemoDate: optionalShortText,
  }),
  payments: z.object({
    creditTerms: optionalText,
    outstandingTracking: optionalText,
    paymentModes: textArray.min(1, "Select at least one payment mode."),
  }),
  purchase: z.object({
    purchaseEntryNeeds: optionalText,
    supplierManagement: optionalText,
    supplierPayments: optionalText,
  }),
  reports: z.object({
    dashboardNeeds: optionalText,
    exportNeeds: optionalText,
    requiredReports: textArray.min(1, "Select at least one report."),
  }),
  sales: z.object({
    billingFlow: optionalText,
    discountNeeds: optionalText,
    gstBilling: optionalText,
    printFormat: optionalText,
    quotationFlow: optionalText,
  }),
});

export type ManglamPublicIntakeInput = z.infer<typeof manglamPublicIntakeSchema>;

export const manglamPublicIntakeDefaults: ManglamPublicIntakeInput = {
  access: {
    languagePreference: "both",
    offlineNeed: "",
    rolesNeeded: [],
  },
  business: {
    address: "",
    businessType: "Hardware and sanitary trading",
    countersOrBranches: "",
    gstin: "",
    teamSize: "",
  },
  catalog: {
    barcodeUsage: "",
    brandHandling: "",
    productCategories: [],
    skuNeeds: "",
    unitTypes: [],
  },
  company: {
    contactName: "",
    email: "",
    firmName: "",
    phone: "",
    role: "",
  },
  inventory: {
    godowns: "",
    lowStockAlerts: "",
    openingStockReadiness: "",
    stockAdjustmentNeeds: "",
    stockTracking: "",
  },
  notes: {
    currentSoftware: "",
    painPoints: "",
    successCriteria: "",
    targetDemoDate: "",
  },
  payments: {
    creditTerms: "",
    outstandingTracking: "",
    paymentModes: [],
  },
  purchase: {
    purchaseEntryNeeds: "",
    supplierManagement: "",
    supplierPayments: "",
  },
  reports: {
    dashboardNeeds: "",
    exportNeeds: "",
    requiredReports: [],
  },
  sales: {
    billingFlow: "",
    discountNeeds: "",
    gstBilling: "",
    printFormat: "",
    quotationFlow: "",
  },
};

export const manglamIntakeSections = [
  { key: "company", label: "A. Contact and firm details" },
  { key: "business", label: "B. Business profile" },
  { key: "catalog", label: "C. Product catalog" },
  { key: "inventory", label: "D. Stock and godown" },
  { key: "sales", label: "E. Sales and billing" },
  { key: "purchase", label: "F. Purchase and suppliers" },
  { key: "payments", label: "G. Payments and outstanding" },
  { key: "reports", label: "H. Reports and dashboard" },
  { key: "access", label: "I. Users, language, offline" },
  { key: "notes", label: "J. Current issues and demo success" },
] as const;
