import type { HardwareInventoryMovementType } from "@trustfirst/database";

export type HardwareProductSummary = {
  barcode: string | null;
  currentStock: number;
  id: string;
  lowStock: boolean;
  lowStockThreshold: number;
  name: string;
  purchaseCostCents: number;
  salesPriceCents: number;
  sku: string;
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

export type HardwareCsvExportContract = {
  columns: string[];
  filename: string;
  format: "csv";
  rows: Array<Record<string, string>>;
};

export type HardwareMovementSummary = {
  id: string;
  productId: string;
  quantity: number;
  type: HardwareInventoryMovementType;
};
