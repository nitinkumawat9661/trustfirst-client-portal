import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  manglamAcceptanceChecklist,
  manglamDemoSeedProfile,
  manglamImportTemplateContract,
  manglamRequirementMapping,
  manglamTradingConfiguration,
} from "./manglam-profile";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

describe("Manglam configuration pack", () => {
  it("defines the locked official identity while leaving commercial values pending", () => {
    expect(manglamTradingConfiguration.tenantSlug).toBe("manglam-trading-demo");
    expect(manglamTradingConfiguration.businessType).toBe("hardware and sanitary");
    expect(manglamTradingConfiguration.firmName).toBe("MANGALAM SANITARY");
    expect(manglamTradingConfiguration.legalName).toBe("KRISHAN KUMAR");
    expect(manglamTradingConfiguration.gstin).toBe("08EFPK7672A1ZT");
    expect(manglamTradingConfiguration.identityStatus).toBe("LOCKED");
    expect(manglamTradingConfiguration.invoicePrefix).toBe("PENDING_CLIENT_CONFIRMATION");
    expect(manglamTradingConfiguration.quotationPrefix).toBe("PENDING_CLIENT_CONFIRMATION");
  });

  it("contains realistic generic hardware and sanitary seed data", () => {
    const categories = new Set(manglamDemoSeedProfile.categories);
    expect(categories.has("Pipes")).toBe(true);
    expect(categories.has("Fittings")).toBe(true);
    expect(categories.has("Sanitary Ware")).toBe(true);
    expect(manglamDemoSeedProfile.products).toHaveLength(8);
    expect(new Set(manglamDemoSeedProfile.products.map((product) => product.sku)).size).toBe(
      manglamDemoSeedProfile.products.length,
    );
  });

  it("keeps reset safety data deterministic and tenant scoped", () => {
    const productSkus = manglamDemoSeedProfile.products.map((product) => product.sku);
    const barcodes = manglamDemoSeedProfile.products.map((product) => product.barcode);
    expect(productSkus.every((sku) => sku.length > 0)).toBe(true);
    expect(new Set(barcodes).size).toBe(barcodes.length);
    expect(manglamTradingConfiguration.defaultStockLocation.code).toBe("MAIN");
  });

  it("defines the required product import template contract", () => {
    const keys = manglamImportTemplateContract.map((column) => column.key);
    expect(keys).toEqual([
      "sku",
      "productName",
      "category",
      "brand",
      "unit",
      "barcode",
      "salePrice",
      "purchaseCost",
      "gstRate",
      "openingStock",
      "lowStockThreshold",
      "stockLocation",
    ]);
    expect(manglamImportTemplateContract.filter((column) => column.required).map((column) => column.key)).toContain(
      "sku",
    );
  });

  it("maps requirements to demo routes and known statuses", () => {
    const routePath = path.resolve(currentDir, "../../app/(platform)/admin/hardware/demo/manglam/page.tsx");
    expect(fs.existsSync(routePath)).toBe(true);
    expect(manglamRequirementMapping.length).toBeGreaterThan(5);
    expect(manglamRequirementMapping.every((row) => row.demoRoute.startsWith("/admin/"))).toBe(true);
    expect(manglamRequirementMapping.some((row) => row.status === "partial")).toBe(true);
  });

  it("covers the requested demo acceptance checklist", () => {
    const keys = new Set(manglamAcceptanceChecklist.map((item) => item.key));
    const requiredKeys = [
      "settings",
      "catalog",
      "stock",
      "quotation",
      "sale",
      "invoice-print",
      "payment",
      "reports",
      "offline",
    ] as const;
    for (const key of requiredKeys) {
      expect(keys.has(key)).toBe(true);
    }
  });

  it("does not hardcode the client name in reusable hardware components or core services", () => {
    const scannedRoots = [
      path.resolve(currentDir, "../../components/hardware"),
      path.resolve(currentDir, "../hardware"),
      path.resolve(currentDir, "../billing"),
      path.resolve(currentDir, "../release"),
    ];
    const files = scannedRoots.flatMap((root) => listSourceFiles(root));
    const offenders = files.filter((file) => /manglam/i.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolutePath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (entry.name.endsWith(".test.ts")) return [];
    return [absolutePath];
  });
}
