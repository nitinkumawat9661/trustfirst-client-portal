export type ImportTemplateColumn = {
  key: string;
  label: string;
  required: boolean;
  example: string;
  notes: string;
};

export type DemoScriptStep = {
  key: string;
  title: string;
  route: string;
  outcome: string;
};

export type RequirementMappingRow = {
  requirement: string;
  implementedModule: string;
  status: "ready" | "partial" | "future";
  demoRoute: string;
  note: string;
};

export type DemoAcceptanceItem = {
  key: string;
  label: string;
  evidence: string;
  limitation?: string;
};

export const manglamTradingConfiguration = {
  addressPlaceholder: {
    city: "Demo City",
    line1: "Address placeholder for client demo",
    line2: "Replace with verified business address before production",
    state: "State placeholder",
  },
  businessType: "hardware and sanitary",
  defaultFinancialYear: "2026-2027",
  defaultGstMode: "exclusive",
  defaultRoundOff: true,
  defaultStockLocation: {
    code: "MAIN",
    name: "Main Godown",
  },
  emailPlaceholder: "demo-contact@example.com",
  firmName: "Manglam Trading Company",
  gstinPlaceholder: "GSTIN-PLACEHOLDER",
  invoicePrefix: "MTC-INV",
  phonePlaceholder: "0000000000",
  quotationPrefix: "MTC-QUO",
  tenantSlug: "manglam-trading-demo",
} as const;

export const manglamImportTemplateContract = [
  { key: "sku", label: "SKU", required: true, example: "PVC-PIPE-001", notes: "Unique per tenant." },
  { key: "productName", label: "Product name", required: true, example: "PVC Pipe 1 inch", notes: "Customer-facing item name." },
  { key: "category", label: "Category", required: true, example: "Pipes", notes: "Created if missing during controlled seed/import flow." },
  { key: "brand", label: "Brand", required: false, example: "GenericFlow", notes: "Optional brand label." },
  { key: "unit", label: "Unit", required: true, example: "PCS", notes: "Mapped to hardware unit code." },
  { key: "barcode", label: "Barcode", required: false, example: "890000000101", notes: "Must be unique when provided." },
  { key: "salePrice", label: "Sale price", required: true, example: "145.00", notes: "Stored as minor currency units." },
  { key: "purchaseCost", label: "Purchase cost", required: true, example: "110.00", notes: "Stored as minor currency units." },
  { key: "gstRate", label: "GST rate", required: true, example: "18", notes: "Percentage rate validated before import execution." },
  { key: "openingStock", label: "Opening stock", required: true, example: "40", notes: "Creates opening stock movement." },
  { key: "lowStockThreshold", label: "Low stock threshold", required: true, example: "5", notes: "Used by low-stock dashboard cards." },
  { key: "stockLocation", label: "Stock location", required: true, example: "Main Godown", notes: "Must resolve to a tenant stock location." },
] as const satisfies readonly ImportTemplateColumn[];

export const manglamDemoSeedProfile = {
  brands: ["GenericFlow", "SanitaryPro", "BuildRight", "TapLine", "SecureFast"],
  categories: [
    "Pipes",
    "Fittings",
    "Taps",
    "Valves",
    "Cement Items",
    "Bathroom Accessories",
    "Sanitary Ware",
    "Electrical Hardware",
    "Fasteners",
  ],
  customers: ["Sample Walk-in Customer", "Sample Contractor Account", "Sample Project Buyer"],
  locations: [manglamTradingConfiguration.defaultStockLocation, { code: "COUNTER", name: "Retail Counter" }],
  products: [
    {
      barcode: "890000000101",
      brand: "GenericFlow",
      category: "Pipes",
      gstRate: 18,
      lowStockThreshold: 10,
      name: "CPVC Pipe 1 inch",
      openingStock: 60,
      purchaseCostCents: 11200,
      salesPriceCents: 14500,
      sku: "CPVC-PIPE-1IN",
      unit: "MTR",
    },
    {
      barcode: "890000000102",
      brand: "GenericFlow",
      category: "Fittings",
      gstRate: 18,
      lowStockThreshold: 12,
      name: "PVC Elbow 90 Degree",
      openingStock: 90,
      purchaseCostCents: 1800,
      salesPriceCents: 2600,
      sku: "PVC-ELBOW-90",
      unit: "PCS",
    },
    {
      barcode: "890000000103",
      brand: "TapLine",
      category: "Taps",
      gstRate: 18,
      lowStockThreshold: 6,
      name: "Chrome Pillar Tap",
      openingStock: 28,
      purchaseCostCents: 76000,
      salesPriceCents: 95000,
      sku: "CHR-PILLAR-TAP",
      unit: "PCS",
    },
    {
      barcode: "890000000104",
      brand: "SanitaryPro",
      category: "Valves",
      gstRate: 18,
      lowStockThreshold: 8,
      name: "Brass Ball Valve 1 inch",
      openingStock: 35,
      purchaseCostCents: 42000,
      salesPriceCents: 54000,
      sku: "BRASS-BALL-VALVE-1",
      unit: "PCS",
    },
    {
      barcode: "890000000105",
      brand: "BuildRight",
      category: "Cement Items",
      gstRate: 28,
      lowStockThreshold: 20,
      name: "Portland Cement Bag 50 kg",
      openingStock: 120,
      purchaseCostCents: 36000,
      salesPriceCents: 42000,
      sku: "CEMENT-BAG-50KG",
      unit: "BAG",
    },
    {
      barcode: "890000000106",
      brand: "SanitaryPro",
      category: "Bathroom Accessories",
      gstRate: 18,
      lowStockThreshold: 7,
      name: "Bathroom Towel Ring",
      openingStock: 24,
      purchaseCostCents: 22000,
      salesPriceCents: 31000,
      sku: "BATH-TOWEL-RING",
      unit: "PCS",
    },
    {
      barcode: "890000000107",
      brand: "SanitaryPro",
      category: "Sanitary Ware",
      gstRate: 18,
      lowStockThreshold: 4,
      name: "Ceramic Wash Basin",
      openingStock: 16,
      purchaseCostCents: 185000,
      salesPriceCents: 235000,
      sku: "CERAMIC-WASH-BASIN",
      unit: "PCS",
    },
    {
      barcode: "890000000108",
      brand: "SecureFast",
      category: "Fasteners",
      gstRate: 18,
      lowStockThreshold: 15,
      name: "Stainless Steel Screw Pack",
      openingStock: 75,
      purchaseCostCents: 5400,
      salesPriceCents: 7800,
      sku: "SS-SCREW-PACK",
      unit: "BOX",
    },
  ],
  suppliers: ["Sample Pipe Supplier", "Sample Sanitary Supplier", "Sample Building Material Supplier"],
  units: ["PCS", "BOX", "BAG", "KG", "MTR"],
} as const;

export const manglamDemoScript = [
  {
    key: "settings",
    outcome: "Confirm firm settings, GST placeholders, prefixes, round-off, and default stock location.",
    route: "/admin/hardware/demo/manglam",
    title: "Configuration review",
  },
  {
    key: "catalog",
    outcome: "Show categories, brands, units, products, barcode fields, pricing, tax configuration, and stock thresholds.",
    route: "/admin/hardware/products",
    title: "Catalog walkthrough",
  },
  {
    key: "quotation",
    outcome: "Create a catalog-backed quotation with discounts, GST summary, and print preview path.",
    route: "/admin/hardware/sales/new",
    title: "Quotation to sale",
  },
  {
    key: "invoice",
    outcome: "Convert quotation to sale, draft invoice, confirm sale, and verify stock deduction.",
    route: "/admin/hardware/sales",
    title: "Sale to invoice",
  },
  {
    key: "payment",
    outcome: "Record manual payment through the billing foundation and review outstanding amount behavior.",
    route: "/admin/billing/payments",
    title: "Payment entry",
  },
  {
    key: "offline",
    outcome: "Queue a draft action offline, restore connectivity, and review sync status plus failure handling.",
    route: "/admin/hardware/demo",
    title: "Offline queue demo",
  },
] as const satisfies readonly DemoScriptStep[];

export const manglamRequirementMapping = [
  {
    demoRoute: "/admin/hardware/demo/manglam",
    implementedModule: "Hardware business settings",
    note: "Uses tenant-scoped configuration with placeholder GSTIN, phone, and address values.",
    requirement: "Client-specific firm configuration",
    status: "ready",
  },
  {
    demoRoute: "/admin/hardware/products",
    implementedModule: "Catalog and inventory foundation",
    note: "Generic hardware/sanitary sample products are available through the separate seed profile.",
    requirement: "Hardware and sanitary item catalog",
    status: "ready",
  },
  {
    demoRoute: "/admin/hardware/sales/new",
    implementedModule: "Hardware sales flow",
    note: "Catalog-backed quotation and sale order flows are implemented without live payment gateway integration.",
    requirement: "Quotation to sale workflow",
    status: "ready",
  },
  {
    demoRoute: "/admin/hardware/print/[documentId]",
    implementedModule: "Print projection",
    note: "Browser print layout is ready with tenant branding from configuration.",
    requirement: "A4 invoice and quotation print preview",
    status: "ready",
  },
  {
    demoRoute: "/admin/hardware/reports",
    implementedModule: "Hardware reports foundation",
    note: "Daily sales, purchases, stock movement, low stock, and outstanding report cards are available.",
    requirement: "Operational reports",
    status: "ready",
  },
  {
    demoRoute: "/admin/hardware/demo",
    implementedModule: "PWA offline queue foundation",
    note: "Offline queue is foundational and does not sync files offline.",
    requirement: "Offline-capable demo flow",
    status: "partial",
  },
  {
    demoRoute: "/admin/billing/payments",
    implementedModule: "Billing and manual payment foundation",
    note: "Manual payment is supported; live payment providers remain contract-only.",
    requirement: "Payment tracking and outstanding amount",
    status: "partial",
  },
] as const satisfies readonly RequirementMappingRow[];

export const manglamAcceptanceChecklist = [
  {
    evidence: "Tenant slug and business settings are defined in the configuration pack.",
    key: "settings",
    label: "Settings ready",
  },
  {
    evidence: "Seed profile includes pipes, fittings, taps, valves, cement items, accessories, sanitary ware, and fasteners.",
    key: "catalog",
    label: "Catalog ready",
  },
  {
    evidence: "Opening stock movements are seeded with tenant-scoped reference metadata.",
    key: "stock",
    label: "Stock ready",
  },
  {
    evidence: "Sales quotation flow is available under the existing hardware sales UI.",
    key: "quotation",
    label: "Quotation ready",
  },
  {
    evidence: "Quotation conversion and sale confirmation use existing stock movement rules.",
    key: "sale",
    label: "Sale ready",
  },
  {
    evidence: "Print preview uses configured firm details and browser print layout.",
    key: "invoice-print",
    label: "Invoice print ready",
  },
  {
    evidence: "Manual payment route is part of the billing foundation.",
    key: "payment",
    label: "Payment ready",
    limitation: "Live payment gateways remain provider contracts only.",
  },
  {
    evidence: "Hardware reports page exposes sales, purchases, stock, and outstanding summaries.",
    key: "reports",
    label: "Reports ready",
  },
  {
    evidence: "Offline queue page and status indicators are available for queued hardware draft actions.",
    key: "offline",
    label: "Offline queue ready",
    limitation: "File sync and native mobile app are intentionally out of scope.",
  },
] as const satisfies readonly DemoAcceptanceItem[];
