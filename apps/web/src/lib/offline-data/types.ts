export const offlineSnapshotSchemaVersion = 1 as const;

export type OfflineDataScope = {
  tenantId: string;
  userId: string;
};

export type OfflineDeviceEnrollment = OfflineDataScope & {
  deviceId: string;
  deviceKey: string;
  enrolledAt: string;
  label: string | null;
  token: string;
};

export type OfflineSnapshotProduct = {
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
  salesDiscountBps: number;
  salesPriceCents: number;
  sku: string;
  stockSetupStatus: "PENDING" | "TRACKED";
  unitCode: string | null;
};

export type OfflineSnapshotParty = {
  balanceSide: "CR" | "DR" | null;
  contact: string | null;
  currentBalanceCents: number;
  gstin: string | null;
  id: string;
  name: string;
  openingBalanceCents: number;
  role: "customer" | "supplier";
};

export type OfflineSnapshotStock = {
  locationId: string;
  productId: string;
  quantity: number;
};

export type OfflineSnapshotDocument = {
  customerName: string | null;
  documentNumber: string;
  id: string;
  paymentStatus: string;
  status: string;
  supplierName: string | null;
  totalCents: number;
  type: string;
  updatedAt: string;
};

export type OfflineSnapshot = OfflineDataScope & {
  brands: Array<{ id: string; name: string; slug: string }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  customers: OfflineSnapshotParty[];
  documents: {
    purchases: OfflineSnapshotDocument[];
    quotations: OfflineSnapshotDocument[];
    sales: OfflineSnapshotDocument[];
  };
  generatedAt: string;
  locations: Array<{ code: string; id: string; name: string }>;
  permissions: string[];
  products: OfflineSnapshotProduct[];
  schemaVersion: typeof offlineSnapshotSchemaVersion;
  settings: {
    address: Record<string, unknown>;
    defaultGstMode: string;
    defaultStockLocationId: string | null;
    email: string | null;
    financialYear: string;
    firmName: string;
    gstin: string | null;
    invoicePrefix: string;
    phone: string | null;
    roundOffEnabled: boolean;
    termsFooter: string | null;
  } | null;
  stock: OfflineSnapshotStock[];
  suppliers: OfflineSnapshotParty[];
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  units: Array<{ code: string; id: string; name: string; precision: number }>;
};

export type OfflineSetupSummary = {
  deviceId: string;
  generatedAt: string;
  productCount: number;
  partyCount: number;
  stockRowCount: number;
};
