# Mangalam Real Business Workflow

Status: `LOCKED_FROM_REAL_REFERENCES`

The protected business references confirm this reusable purchase path:

`Supplier -> Purchase Invoice -> Items -> HSN/GST review -> Discounts -> Tax -> Confirmation -> Stock inward -> Supplier outstanding -> Payment settlement -> Ledger`

## Locked Rules

- Reference invoices never create stock or ledger entries.
- Stock inward occurs only after a separately entered or imported purchase is explicitly confirmed.
- Supplier invoice number and date are preserved for audit and duplicate checks.
- Original/list rate, per-line discount percentage, and net taxable amount are distinct values.
- Tax classification is line-aware and supports CGST, SGST, and IGST.
- Supplier outstanding supports opening balance, invoice posting, payment adjustment, Dr/Cr status, and statement history.
- Reversal and cancellation must preserve the original audit trail.

Current invoice quantities, historical rates, discounts, balances, and parties remain `OBSERVED_REFERENCE`, not operational data.
