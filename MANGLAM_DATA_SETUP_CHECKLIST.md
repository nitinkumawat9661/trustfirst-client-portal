# Mangalam Sanitary Data Setup Checklist

Source requirement: `PUB-REQ-2026-0015`.

Real client data must be stored only in the isolated Mangalam tenant. Demo, seed, smoke, and QA records must not be copied into the production client dataset.

## Identity And Settings

- [ ] Confirm registered firm spelling
- [ ] Validate GSTIN from the protected submission
- [ ] Validate registered address and contact details
- [ ] Receive logo file
- [ ] Confirm financial year
- [ ] Confirm default GST mode
- [ ] Confirm round-off policy
- [ ] Confirm invoice prefix and sequence
- [ ] Confirm quotation prefix and sequence
- [ ] Confirm terms/footer and signature text
- [ ] Create one approved default stock location

## Categories, Brands, And Units

- [ ] Confirm selected eight categories
- [ ] Confirm category hierarchy and subcategories
- [ ] Receive brand list
- [ ] Confirm Piece, Box, Set, Pair, and Bundle definitions
- [ ] Confirm whether unit conversion is required
- [ ] Confirm SKU format and ownership of code assignment

## Product Import Columns

- [ ] SKU
- [ ] Product name
- [ ] Category
- [ ] Brand
- [ ] Unit
- [ ] Description or variant
- [ ] Purchase cost
- [ ] Sale price
- [ ] GST rate
- [ ] HSN code if required
- [ ] Opening-stock quantity
- [ ] Opening-stock valuation cost
- [ ] Low-stock threshold
- [ ] Stock location
- [ ] Barcode left blank unless adopted later

## Product Import Controls

- [ ] Validate required columns
- [ ] Validate category, brand, and unit references
- [ ] Reject or skip duplicate SKU according to approved rule
- [ ] Reject duplicate barcode only when a barcode is supplied
- [ ] Reject negative prices, costs, quantities, and thresholds
- [ ] Preview accepted and rejected rows
- [ ] Obtain client approval of preview
- [ ] Import products
- [ ] Create opening-stock movements separately and idempotently
- [ ] Reconcile imported stock totals against the client file

## Suppliers

- [ ] Supplier legal/trading name
- [ ] Phone/email/address
- [ ] GSTIN if applicable
- [ ] Payment terms
- [ ] Opening payable
- [ ] Opening advance
- [ ] Outstanding bill references and dates

## Customers

- [ ] Customer name
- [ ] Phone/email/address
- [ ] GSTIN if applicable
- [ ] Credit limit
- [ ] Credit days
- [ ] Opening receivable
- [ ] Opening advance
- [ ] Outstanding invoice references and dates

## Users And Permissions

- [ ] Identify Owner user
- [ ] Identify Manager user
- [ ] Confirm login email/phone method
- [ ] Approve Owner permissions
- [ ] Approve Manager permissions
- [ ] Verify tenant membership
- [ ] Test denied operations for Manager

## Migration Reconciliation

- [ ] Product count matches approved import
- [ ] Stock quantity and value match approved opening balance
- [ ] Supplier opening outstanding matches approved source
- [ ] Customer opening outstanding matches approved source
- [ ] Tax rates and HSN values pass validation
- [ ] No smoke/test customers, suppliers, products, or documents exist in the real dataset
- [ ] Client signs off the migration summary
