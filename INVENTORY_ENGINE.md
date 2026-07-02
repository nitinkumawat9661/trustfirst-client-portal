# Inventory Engine

The Inventory Engine records immutable stock movements for products and stock locations.

## Movements

- Stock In
- Stock Out
- Stock Adjustment

Stock adjustments set the current stock quantity for a product. Stock out is rejected when quantity exceeds available stock.

## Locations

Stock locations represent godowns, warehouses, storefronts, or other tenant-defined places where inventory is stored.

## Alerts

Low stock is calculated from product threshold and current movement balance. Movement transactions emit timeline events when stock reaches the threshold.

## Ledger Boundary

This is an inventory movement ledger only. It is not a full accounting ledger and does not implement ERP finance.
