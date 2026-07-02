# Manglam Requirement Mapping

| Client requirement | Implemented module | Current status | Demo route | Pending/future note |
| --- | --- | --- | --- | --- |
| Firm configuration | Hardware business settings | Ready | `/admin/hardware/demo/manglam` | Replace placeholders before production onboarding. |
| Hardware and sanitary catalog | Catalog and inventory foundation | Ready | `/admin/hardware/products` | Import execution remains guarded by duplicate validation. |
| Opening stock | Inventory ledger | Ready | `/admin/hardware/inventory` | Production stock should come from verified import. |
| Quotation creation | Hardware sales flow | Ready | `/admin/hardware/sales/new` | Uses configured tenant data and catalog items. |
| Quotation to sale | Hardware sales flow | Ready | `/admin/hardware/sales` | Existing conversion flow is used. |
| Sale invoice draft | Billing and invoice foundation | Ready | `/admin/billing/invoices` | Full accounting ledger is out of scope. |
| A4 print preview | Hardware print projection | Ready | `/admin/hardware/print/[documentId]` | Browser print is supported; dedicated PDF rendering remains contract-based. |
| Manual payment entry | Billing payment foundation | Partial | `/admin/billing/payments` | Live providers remain contract-only. |
| Outstanding tracking | Billing foundation | Partial | `/admin/billing` | Supplier outstanding remains contract-level. |
| Offline queue demo | PWA offline queue foundation | Partial | `/admin/hardware/demo` | File sync and native mobile app are out of scope. |
| Operational reporting | Hardware reports foundation | Ready | `/admin/hardware/reports` | Advanced analytics can be added later through report engine. |

## Demo Walkthrough

1. Review configuration pack.
2. Review catalog, categories, brands, units, barcode fields, prices, GST rates, and stock.
3. Create quotation from catalog items.
4. Convert quotation to sale.
5. Draft invoice and open print preview.
6. Confirm sale and verify stock deduction.
7. Record manual payment and review outstanding amount behavior.
8. Show offline queue status and retry controls.
