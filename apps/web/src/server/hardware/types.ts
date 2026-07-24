import type { HardwareInventoryMovementType } from "@trustfirst/database";

export type HardwareProductSummary = {
  barcode: string | null;
  brandName: string | null;
  categoryName: string | null;
  currentStock: number;
  gstRateBps: number | null;
  hsnCode: string | null;
  id: string;
  lowStock: boolean;
  lowStockThreshold: number;
  name: string;
  purchaseCostCents: number;
  salesPriceCents: number;
  sku: string;
  status: "ACTIVE";
  unitCode: string | null;
};

export type InventoryDashboard = {
  lowStockProducts: number;
  products: number;
  stockIn: number;
  stockOut: number;
  stockValueCents: number;
};

export type HardwareImportPreview = {
  errors: Array<{ message: string; row: number }>;
  validRows: number;
};

export type HardwareImportSummary = HardwareImportPreview & {
  createdRows: number;
  skippedRows: number;
};

export type HardwareCsvExportContract = {
  columns: string[];
  filename: string;
  format: "csv";
  rows: Array<Record<string, string>>;
};

export type HardwareMovementSummary = {
  id: string;
  locationName: string;
  occurredAt: Date;
  productName: string;
  productId: string;
  quantity: number;
  type: HardwareInventoryMovementType;
};

export type HardwarePartyRole = "customer" | "supplier";

export type HardwarePartySummary = {
  balanceSide: "CR" | "DR" | null;
  contact: string | null;
  currentBalanceCents: number;
  gstin: string | null;
  id: string;
  name: string;
  openingBalanceCents: number;
  role: HardwarePartyRole;
};

export type HardwareOperationalDashboard = InventoryDashboard & {
  pendingPaymentsCents: number;
  recentBills: Array<{ documentNumber: string; totalCents: number }>;
  recentPurchases: Array<{ documentNumber: string; totalCents: number }>;
  todayPurchasesCents: number;
  todaySalesCents: number;
  topProducts: Array<{ name: string; quantity: number; sku: string }>;
};

export type HardwareDemoChecklistItem = {
  description: string;
  key: string;
  ready: boolean;
  title: string;
};

export type HardwareDemoReadiness = {
  counts: {
    customers: number;
    products: number;
    stockLocations: number;
  };
  items: HardwareDemoChecklistItem[];
  ready: boolean;
};
