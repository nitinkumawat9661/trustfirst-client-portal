# Catalog Engine

The Catalog Engine models reusable product data for hardware and sanitary businesses.

## Entities

- Product category
- Brand
- Unit
- Product/SKU
- Barcode
- GST/tax configuration contract

## Pricing

Products support sales-ready item pricing and purchase-ready item costing as minor-unit integer amounts. This does not create invoice, ledger, or payment behavior by itself.

## Import And Export

Excel import preview validates rows before persistence. CSV export returns a contract with columns and rows for downstream exporters.
