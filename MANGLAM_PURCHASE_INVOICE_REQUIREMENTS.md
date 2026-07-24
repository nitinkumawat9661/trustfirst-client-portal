# Mangalam Purchase Invoice Requirements

Status: `LOCKED_REQUIREMENT`

## Header And References

- Supplier name, address, GSTIN, invoice number, and invoice date
- Buyer and optional ship-to name, addresses, GSTIN, state, and state code
- Optional delivery note, buyer order, dispatch document, delivery date, destination, payment terms, and delivery terms

## Line Items

- Product description and optional product link
- HSN/SAC, quantity, unit/per, original/list rate
- Per-line discount percentage and discount value
- Effective rate, taxable amount, tax classification, and line total
- Multiple lines, HSNs, tax classifications, and continuation pages

`LINE_LEVEL_PURCHASE_DISCOUNT = CONFIRMED`. Different items may use different percentages; no percentage is a platform default. Bill-level discounts remain separate.

## Tax And Totals

- CGST, SGST, and IGST capability
- HSN-wise taxable and tax summary
- Subtotal, discount, taxable value, each tax total, round-off, grand total, and amount in words

Not every optional field is mandatory on every invoice. Validation must follow tenant policy and transaction context.
