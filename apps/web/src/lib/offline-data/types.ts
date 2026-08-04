export const offlineSnapshotSchemaVersion = 2 as const;

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

export type OfflineNumberSeries =
  | "HPE"
  | "HPO"
  | "HPR"
  | "HSB"
  | "HSO"
  | "HSQ"
  | "HSR"
  | "MS/INV";

export type OfflineNumberLease = {
  deviceId: string;
  endValue: number;
  expiresAt: string;
  financialYear: string;
  format: "invoice" | "trade";
  id: string;
  nextValue: number;
  prefix: string;
  series: OfflineNumberSeries;
  startValue: number;
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

export type OfflineSnapshotFinancialOpenItem = {
  documentNumber: string;
  dueCents: number;
  hardwareDocumentId: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  occurredAt: string;
  originalCents: number;
  paidCents: number;
  sourceId: string | null;
  targetTransactionId: string;
};

export type OfflineSnapshotFinancialPosition = {
  advanceBalanceCents: number;
  openItems: OfflineSnapshotFinancialOpenItem[];
  partyId: string;
  partyName: string;
  refundableBalanceCents: number;
  totalOutstandingCents: number;
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
  financialPositions?: {
    customers: OfflineSnapshotFinancialPosition[];
    suppliers: OfflineSnapshotFinancialPosition[];
  };
  generatedAt: string;
  locations: Array<{ code: string; id: string; name: string }>;
  numberLeases: OfflineNumberLease[];
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
  numberLeaseCount: number;
  productCount: number;
  partyCount: number;
  stockRowCount: number;
};
