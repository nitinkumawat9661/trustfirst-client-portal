# User Roles

## Role Model

Roles define default responsibility bundles. Permissions define actual access. A user may hold different roles in different tenants, clients, engagements, or projects.

## Platform Roles

### Platform Owner

Operates the TrustFirst SaaS platform. Can manage tenants, platform settings, billing metadata, and global support access.

### Platform Support

Provides support to tenants with limited, audited, time-bound access.

## Tenant Roles

### Tenant Owner

Owns the tenant account, billing relationship, global settings, security policies, and user administration.

### Tenant Admin

Manages tenant configuration, users, client organizations, templates, and operational settings.

### Account Manager

Owns client relationships, client onboarding, engagement setup, requirements coordination, approvals, and communication.

### Delivery Manager

Plans and tracks engagements, projects, deliverables, milestones, and delivery health.

### Team Member

Contributes to delivery work, comments, uploads files, completes tasks, and responds to assigned items.

### Finance User

Views commercial metadata, invoices, billing status, procurement notes, and contract-related files where permitted.

### Read-Only Internal User

Can view assigned clients and engagements without making changes.

## Client Roles

### Client Owner

Primary client-side sponsor with broad access to their organization, engagements, approvals, and files.

### Client Admin

Manages client-side contacts and access for their organization.

### Client Contributor

Submits requirements, comments, uploads requested files, and participates in reviews.

### Client Approver

Can approve or reject requirements, deliverables, milestones, budgets, or change requests.

### Client Viewer

Can view shared records and files without editing or approval rights.

## External Roles

### External Collaborator

A limited participant such as a contractor, partner, vendor, auditor, legal reviewer, or specialist.

### Guest Reviewer

Temporary, narrow access for review-only workflows.

## Role Assignment Rules

- Tenant roles apply within one tenant only.
- Client roles apply within one client organization unless scoped narrower.
- Engagement and project roles override or restrict broader defaults.
- External roles must have expiration support.
- Platform support access must be explicit, audited, and time-bound.
