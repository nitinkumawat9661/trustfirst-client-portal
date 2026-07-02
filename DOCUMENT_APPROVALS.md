# Document Approvals

Document approvals are status transitions enforced by `CommercialDocumentService`.

## States

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`

## Rules

Only drafts can be edited. Drafts can be submitted for approval. Pending documents can be approved or rejected. Approved documents can be archived, but cannot be edited in place.

## Auditability

Every state-changing action creates a commercial document timeline event. Approval and rejection store actor IDs and timestamps on the document record.

## Security

All actions require tenant membership and server-side permissions:

- `documents.read`
- `documents.manage`
- `documents.approve`

The wildcard permission remains supported for system administrators.
