# Hardware ERP Plugin

The Hardware & Sanitary ERP plugin is a tenant-scoped module pack for catalog and inventory foundations. It is Manglam-ready but contains no hardcoded tenant, brand, or business-specific values.

## Capabilities

- Hardware and sanitary service line
- Product categories, brands, units, products, SKUs, and barcode fields
- GST/tax configuration contract only
- Stock locations and godowns
- Inventory movement ledger
- Stock in, stock out, and stock adjustments
- Supplier and customer/client links
- Sales-ready pricing and purchase-ready costing
- Excel import preview and CSV export contracts
- Product search and inventory dashboard cards

## Security

All operations are tenant-scoped and protected by plugin permissions:

- `hardware.catalog.read`
- `hardware.catalog.manage`
- `hardware.inventory.read`
- `hardware.inventory.manage`
- `hardware.plugin.manage`

## Integrations

The module is designed to coexist with CRM, Commercial Documents, Billing, Requirements, and Projects through generic references and client links.
