# Invoice Engine

Invoices are stored as dedicated billing records and may link to commercial documents, clients, projects, and requirements.

## Lifecycle

- `DRAFT`
- `ISSUED`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `VOID`
- `ARCHIVED`

Draft invoices can be edited and issued. Issued invoices can receive manual payments. Fully paid invoices become `PAID`; partial payments become `PARTIALLY_PAID`. Overdue status is calculated from due date when an issued invoice is past due.

## Numbering

Invoices use tenant-scoped yearly numbers:

`INV-2026-0001`

## Amounts

Amounts are stored in minor units as integer cents. This keeps invoice totals and outstanding balances deterministic without introducing accounting-ledger behavior.

## Rendering

Invoice PDF output is represented by a render contract only. Actual PDF generation remains a provider implementation concern.
