# File Storage Architecture

## Purpose

File storage must support client work across documents, media, brand assets, contracts, datasets, exports, deliverables, screenshots, reports, source files, and implementation artifacts.

## File Scopes

- Tenant-level files
- Client organization files
- Engagement files
- Project files
- Requirement attachments
- Approval evidence
- Deliverable files
- Internal-only files

## File Metadata

Each file asset should track:

- Tenant ID
- File owner
- Scope type and scope ID
- Visibility level
- Original filename
- Storage key
- MIME type
- Size
- Checksum
- Version number
- Upload source
- Created timestamp
- Retention policy
- Virus scan status

## Visibility Levels

- Internal only
- Client visible
- Client upload
- Restricted
- External collaborator visible
- Public link, if tenant permits it

## Versioning

- Store file metadata separately from physical objects.
- Preserve file versions where approvals or deliverables depend on them.
- Show latest version by default.
- Allow version history for authorized users.
- Never silently replace approved deliverables.

## Storage Strategy

Recommended production storage:

- Object storage for binary files.
- Database records for metadata and permissions.
- Signed URLs for temporary access.
- Background scanning for malware.
- Lifecycle policies for retention and archival.

## Access Rules

- Every file request must verify tenant, scope, visibility, and user permission.
- Client users can only access files explicitly shared with their organization or scope.
- Restricted files require direct grants.
- External collaborator file access must expire.

## Retention

- Retention should be tenant-configurable.
- Legal, finance, and contract records may require longer retention.
- Deleted files should enter a recoverable deletion window.
- Permanent deletion should be audited.

## File Categories

- Contract
- Requirement
- Brand asset
- Creative asset
- Website asset
- Campaign asset
- ERP artifact
- AI artifact
- Data file
- Report
- Deliverable
- Support evidence
- Other
