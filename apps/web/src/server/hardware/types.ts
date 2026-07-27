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
  stockSetupStatus: "TRACKED" | "PENDING";
  status: "ACTIVE";
  unitCode: string | null;
};

export type LedgerEntry = {
  amountCents: number;
  balanceCents: number;
  creditCents: number;
  date: Date;
  debitCents: number;
  description: string;
  reference: string;
};

export type PartyLedger = {
  entries: LedgerEntry[];
  openingBalanceCents: number;
  partyId: string;
  partyName: string;
  totalPaidCents: number;
  totalPayableCents: number;
  totalRemainingCents: number;
};

export type HardwareReminder = {
  actionHref: string;
  amountCents?: number;
  count?: number;
  currentStock?: number;
  id: string;
  label: string;
  severity: "info" | "warning" | "critical";
  title: string;
  type: "customer-outstanding" | "supplier-payable" | "low-stock" | "zero-stock" | "stock-setup-pending";
};

export type InventoryDashboard = {
  lowStockProducts: number;
  products: number;
  stockIn: number;
  stockOut: number;
  stockValueCents: number;
};

export type HardwareImportPreview = {
  errors: Array<{ field?: string; message: string; row: number }>;
  importId: string;
  mode: "create" | "update" | "upsert";
  rows: Array<{
    action: "create" | "skip" | "update";
    barcode: string | null;
    brand: string | null;
    category: string | null;
    name: string;
    openingStock: number;
    row: number;
    sku: string;
    stockLocation: string | null;
    unit: string | null;
    warnings: string[];
  }>;
  validRows: number;
};

export type HardwareImportSummary = HardwareImportPreview & {
  createdRows: number;
  dryRun: boolean;
  skippedRows: number;
  updatedRows: number;
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
