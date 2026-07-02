# Requirement Engine

The Requirement Engine is a tenant-aware aggregate for collecting, validating, reviewing, versioning, and approving client requirements.

## Aggregate

`Requirement` owns:

- dynamic form schema
- draft data
- submitted data
- current version
- assignment fields
- approval status
- attachments
- comments
- timeline events
- notifications

Every operation is routed through `RequirementService`, which enforces permissions and delegates persistence to `PrismaRequirementRepository`.

## Drafts

Drafts support autosave and manual save. Each save creates a `RequirementDraft` revision and logs a timeline event. The latest draft data is also stored on the requirement for fast resume.

## Versioning

Submission creates a new immutable `RequirementVersion`. Versions are numbered `v1`, `v2`, `v3`, and so on. The service supports comparing JSON payload keys between versions and restoring a historical version into the active requirement data.

## Timeline

Timeline events are created for:

- created
- draft saved
- submitted
- review requested
- changes requested
- approved
- rejected
- commented
- attached
- assigned
- version restored

## Attachments And Comments

Attachments are version-aware and tenant scoped. Comments are threaded, support mention metadata, and can be resolved.

## Notifications

Notification records are created for draft saved, submitted, approved, rejected, changes requested, and mentioned events. Delivery providers are not connected in this sprint.

