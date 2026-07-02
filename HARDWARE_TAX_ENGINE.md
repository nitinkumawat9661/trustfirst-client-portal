# Hardware Tax Engine

The Hardware Tax Engine calculates item-level discount, GST/tax, and round-off for hardware trade documents.

## Tax Configuration

Product GST/tax configuration is stored as JSON contract data on catalog products. Trade items can override the tax rate with `taxRateBps`; otherwise the product config rate is used.

## Calculation

For each item:

- subtotal = quantity x unit amount
- discount is subtracted at item level
- tax = taxable amount x tax rate basis points
- document total = subtotal - discounts + tax + round-off

No accounting ledger or tax filing workflow is implemented in this sprint.
