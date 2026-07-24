# Next Sprint Plan: Verified Master Data And Reconciliation

## Decision

The next recommended sprint is:

`MANGALAM VERIFIED MASTER DATA IMPORT AND OPENING RECONCILIATION`

The platform, official identity, production domain, real workflow references, cleanup controls, and final operational UI are in place. The next constraint is data quality, not another feature module.

## Scope

1. Obtain the client-approved product workbook.
2. Preview categories, brands, units, SKU/barcode uniqueness, HSN, GST, purchase price, sale price, and low-stock threshold.
3. Keep every uncertain HSN/GST mapping in `PENDING_REVIEW`; never infer one from a category or supplier invoice.
4. Obtain location-wise opening stock with an agreed reconciliation date.
5. Preview stock totals and require client sign-off before posting opening movements.
6. Obtain actual customer and supplier masters with GSTIN, address, contact, opening balance, Dr/Cr side, and reconciliation date.
7. Preview duplicates and conflicts against the empty production master.
8. Apply approved records idempotently with an immutable import receipt and row-level rejection report.
9. Reconcile imported counts and monetary totals with the signed client source.
10. Run production smoke, authenticated QA, print QA, and rollback verification.

## Hard Boundaries

- Do not import invoice-reference quantities as stock.
- Do not import historical supplier invoice rates as current prices.
- Do not import sample invoice balances.
- Do not convert `REVIEW_REQUIRED` intake records into parties.
- Do not overwrite locked official identity or branding.
- Do not import a row with unresolved tenant, SKU, barcode, HSN, GST, location, or balance-side conflicts.
- Do not touch CafeLuxe.

## Required Inputs

- Approved product master
- Verified HSN/GST decisions
- Current purchase and sale prices
- Opening stock by location and date
- Customer and supplier masters
- Opening balances, Dr/Cr side, and date
- Financial year and document prefixes
- Round-off policy and print terms/footer
- Owner/Manager account and permission decisions

## Acceptance Evidence

- Protected import source hash
- Dry-run report
- Client approval record
- Applied import receipt
- Created/rejected/unchanged counts
- Opening stock reconciliation
- Party balance reconciliation
- Rollback command and backup reference
- Production UI verification with no demo data

## Readiness

- Architecture ready: yes
- Production UI ready for verified data: yes, subject to final live deployment QA
- Real master-data import ready: no, waiting for the listed client-approved files and decisions
- Further speculative feature development recommended: no
