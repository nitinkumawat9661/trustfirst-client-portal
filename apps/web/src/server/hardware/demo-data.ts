import { HardwareTradeDocumentType } from "@trustfirst/database";

export const genericHardwareDemoData = {
  brands: ["GenericFlow", "SanitaryPro", "BuildRight"],
  categories: ["Bathroom Fittings", "Pipes", "Tools", "Adhesives"],
  customers: ["Sample Retail Customer", "Sample Project Customer"],
  locations: ["Main Godown", "Retail Counter"],
  products: [
    { barcode: "890000000001", category: "Pipes", name: "PVC Pipe 1 inch", sku: "PVC-PIPE-1", stock: 50 },
    { barcode: "890000000002", category: "Bathroom Fittings", name: "Chrome Basin Tap", sku: "CHR-TAP-1", stock: 20 },
    { barcode: "890000000003", category: "Adhesives", name: "Tile Adhesive Bag", sku: "TILE-ADH-20KG", stock: 35 },
  ],
  suppliers: ["Sample Hardware Supplier", "Sample Sanitary Supplier"],
  tradeDocuments: [
    { type: HardwareTradeDocumentType.SALES_QUOTATION },
    { type: HardwareTradeDocumentType.PURCHASE_ENTRY },
  ],
  units: ["PCS", "BOX", "KG", "MTR"],
} as const;
