# Hardware Demo Flow

## Purpose

Hardware ERP demo readiness provides a tenant-scoped operating flow for hardware and sanitary businesses without hardcoding any specific firm. Demo data is generic and can be replaced by tenant settings, catalog imports, and customer records.

## End-to-End Flow

1. Configure hardware business settings with firm identity, GSTIN, invoice prefix, financial year, default GST mode, round-off behavior, and default stock location.
2. Seed or import generic products, categories, brands, units, customers, suppliers, and stock locations.
3. Create a product with SKU and optional barcode.
4. Add opening stock into the default stock location.
5. Create or select a customer.
6. Create a sales quotation with catalog items, discount, GST, and round-off.
7. Convert the quotation to a sales order.
8. Confirm the sale from an authorized stock location.
9. Stock is deducted through hardware inventory movements.
10. Generate a print preview for the invoice or quotation.
11. Record manual payment through the billing foundation.
12. Outstanding amount updates through invoice and payment records.

## Demo Data

The seed contract includes generic hardware and sanitary sample products, categories, brands, units, customers, suppliers, stock locations, and sample trade documents. Data is intentionally non-branded so a tenant can demonstrate the same flow for any firm.

## Operational Checks

- Barcode search should return a product summary with current stock.
- Duplicate SKUs and duplicate barcodes are handled during confirmed imports.
- Low-stock cards are derived from product thresholds and inventory movements.
- Pending payments are derived from unpaid or partially paid invoices.
- Print preview uses tenant settings for firm details and terms.

## Boundaries

This sprint does not introduce offline sync, native mobile screens, live payment gateways, or a full accounting ledger. Payment behavior remains manual and connected only through existing billing records.
