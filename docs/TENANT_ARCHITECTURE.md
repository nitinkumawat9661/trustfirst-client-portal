# Tenant Architecture

## Purpose

TrustFirst Client Portal is a multi-tenant SaaS platform. Tenant architecture must isolate data, configuration, users, files, notifications, and audit trails for each subscribing business.

## Tenant Model

A tenant represents one subscribing organization. Each tenant owns:

- Users and memberships
- Client organizations
- Client contacts
- Engagements and projects
- Files and approvals
- Templates and service lines
- Notification rules
- Branding settings
- Audit history

## Isolation Strategy

Baseline approach:

- Shared application runtime.
- Shared database with tenant-scoped records.
- `tenant_id` on every business entity.
- Tenant-aware authorization for every query and action.
- Tenant-prefixed object storage keys.

Future enterprise options:

- Dedicated database per enterprise tenant.
- Dedicated object storage bucket per tenant.
- Custom domains.
- Tenant-specific encryption keys.
- Data residency controls.

## Tenant Configuration

Tenants should be able to configure:

- Brand name, logo, color preferences
- Service lines
- Client lifecycle statuses
- Engagement templates
- Requirement templates
- Notification rules
- File retention rules
- User roles and permission bundles
- Approval policies
- External collaborator rules

## Tenant Identity

Tenant resolution may support:

- Subdomain
- Custom domain
- Tenant slug in URL
- Authenticated membership context

The selected strategy must prevent tenant enumeration and cross-tenant data access.

## Scaling Considerations

To support 10,000+ client organizations:

- Use tenant-leading indexes.
- Paginate all list views.
- Avoid cross-tenant scans.
- Partition or archive high-volume audit and notification data when needed.
- Use asynchronous jobs for notifications, file scanning, imports, and exports.
- Cache tenant configuration safely by tenant ID.

## Security Rules

- Tenant membership is required for internal access.
- Client contact access is scoped to their client organization and explicit grants.
- Platform support access must be time-bound and audited.
- Tenant administrators cannot access other tenants.
- Storage keys must not expose predictable sensitive paths.

## Audit Rules

Audit events should include:

- Tenant ID
- Actor type and actor ID
- Action
- Target type and target ID
- IP address or session context where available
- Timestamp
- Metadata without leaking secrets

## Tenant Lifecycle

Tenant states:

- Trial
- Active
- Suspended
- Past due
- Cancelling
- Cancelled
- Archived

Tenant state should control access, billing prompts, data retention, and export rights.
