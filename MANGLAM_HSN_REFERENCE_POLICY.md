# Mangalam HSN Reference Policy

HSN observations are staged in `config/client-profiles/manglam-trading-demo/observed-hsn-reference.json`.

Allowed statuses:

- `OBSERVED_FROM_INVOICE`
- `VERIFIED`
- `CONFLICT`
- `PENDING_REVIEW`

An invoice is evidence, not automatic product-master authority. Similar names may require different classifications, a product may override a category candidate, and HSN may remain blank until verified. The platform must never guess a code or assign one observed code to a complete category.

`GST_ENGINE_SUPPORT` requires CGST, SGST, IGST, HSN-aware reporting, and per-line tax classification. The observed Rajasthan documents demonstrate 9% CGST plus 9% SGST examples, but 18% is not a global default and no observed rate is imported.
