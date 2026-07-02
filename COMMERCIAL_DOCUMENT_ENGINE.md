# Commercial Document Engine

The Commercial Document Engine manages configurable tenant-scoped documents without implementing ERP, inventory, ledger, tax, or payment collection behavior.

## Scope

Version 1 implements quotation, proposal, estimate, agreement, work order, and receipt workflows. Invoice exists in the database enum for forward compatibility, but invoice-specific tax, ledger, and payment logic is intentionally excluded.

## Architecture

- `CommercialDocumentService` owns lifecycle rules, document numbering, permission checks, link validation, export contracts, and PDF render contracts.
- `PrismaCommercialDocumentRepository` owns persistence and transactional timeline/version writes.
- API routes stay thin and delegate business rules to the service layer.
- Documents are tenant-scoped and can link to client, project, and requirement records.

## Lifecycle

Documents begin as `DRAFT`, move to `PENDING_APPROVAL`, and then become `APPROVED` or `REJECTED`. Approved, rejected, pending, and draft records may be archived according to service transition rules.

## Numbering

Numbers are generated per tenant, type, and UTC year:

- `QUO-2026-0001`
- `PRP-2026-0001`
- `EST-2026-0001`
- `AGR-2026-0001`
- `WOR-2026-0001`
- `RCT-2026-0001`

## Integrations

CSV export and PDF render are contract-only. Rendering engines, storage providers, and notification delivery remain pluggable platform responsibilities.
