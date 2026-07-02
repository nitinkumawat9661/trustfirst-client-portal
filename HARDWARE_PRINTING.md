# Hardware Printing

## Scope

Hardware print readiness provides an A4 browser print projection for quotations and invoices. The implementation is designed for print preview and future PDF rendering, while keeping PDF generation behind the existing render contract.

## Print Projection

The print projection contains:

- Firm name, GSTIN, address, phone, email, logo placeholder, and terms footer from hardware business settings.
- Customer details from the linked client organization.
- Document number, document type, totals, and totals in words.
- Item table with quantity, rate, discount, GST, and line total.
- GST summary grouped by tax rate.
- Round-off and final total.
- Signature area.

## Browser Print Layout

The admin print page uses an A4-oriented layout with print-specific CSS:

- A4 page sizing.
- White printable surface.
- Hidden non-print controls.
- Stable table layout for item rows.
- Signature and footer areas suitable for physical copies.

## Contracts

The print contract remains renderer-neutral:

- `format`: `a4`
- `renderer`: `pdf`
- `templateKey`: `hardware-trade-a4-v1`

Future PDF or DOCX renderers should consume the same projection rather than querying database records directly.

## Quality Rules

- Print output must be tenant-scoped and permission checked.
- Firm information must come from settings, not component constants.
- GST summaries must be calculated from document line items.
- Business branding must remain configurable per tenant.
