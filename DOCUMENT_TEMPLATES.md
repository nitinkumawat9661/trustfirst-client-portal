# Document Templates

Commercial documents use `templateKey`, `branding`, `content`, and `metadata` payloads so tenants can configure document presentation without hardcoded business values.

## Template Contract

A template identifies reusable document structure, sections, and rendering hints. The service stores the selected `templateKey` and leaves visual rendering to PDF/DOCX providers.

## Branding

Tenant branding is stored on each document snapshot as JSON. This allows generated versions to preserve the branding state used at the time of creation.

## Versioning

Every create and draft edit writes a `CommercialDocumentVersion` record. Versions preserve content snapshots and enable later compare/restore work without changing the v1 approval flow.

## Supported v1 Types

- Quotation
- Proposal
- Estimate
- Agreement
- Work Order
- Receipt

Invoice templates can be modeled later, but v1 does not implement tax, ledger, payment collection, or accounting semantics.
