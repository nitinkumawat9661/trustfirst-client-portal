import type { PluginManifest } from "../commercial-platform";

export const hardwareErpPluginManifest: PluginManifest = {
  capabilities: [
    {
      configSchema: {
        serviceLine: "hardware_sanitary_erp",
        taxConfig: "contract_only",
      },
      key: "hardware.catalog",
      permissions: ["hardware.catalog.read", "hardware.catalog.manage"],
    },
    {
      configSchema: {
        ledger: "inventory_movements_only",
        lowStockAlerts: true,
      },
      key: "hardware.inventory",
      permissions: ["hardware.inventory.read", "hardware.inventory.manage"],
    },
  ],
  category: "erp_module",
  id: "hardware-sanitary-erp",
  name: "Hardware & Sanitary ERP",
  version: "1.0.0",
};

export const hardwareServiceLine = {
  description: "Catalog, SKU, stock location, and inventory movement foundation for hardware and sanitary businesses.",
  key: "hardware_sanitary_erp",
  name: "Hardware & Sanitary ERP",
} as const;
