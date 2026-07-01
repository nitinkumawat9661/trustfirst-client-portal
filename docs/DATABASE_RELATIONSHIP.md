# Database Relationship Architecture

## Purpose

This document defines the target data relationships for a commercial multi-tenant client portal. It is architectural guidance and does not require immediate schema implementation.

## Relationship Summary

```txt
Tenant
  has many Users through TenantMembership
  has many ClientOrganizations
  has many ServiceLines
  has many Templates

ClientOrganization
  belongs to Tenant
  has many ClientContacts
  has many Engagements
  has many Requirements
  has many FileAssets

Engagement
  belongs to Tenant
  belongs to ClientOrganization
  belongs to ServiceLine
  has many Projects
  has many Requirements
  has many Deliverables
  has many Approvals
  has many FileAssets

Project
  belongs to Engagement
  has many Milestones
  has many Tasks
  has many Deliverables
  has many Requirements
  has many FileAssets

FileAsset
  belongs to Tenant
  optionally belongs to ClientOrganization
  optionally belongs to Engagement
  optionally belongs to Project
  has many FileVersions
  has many AccessGrants

Notification
  belongs to Tenant
  belongs to Recipient User or ClientContact
  optionally references an entity

AuditEvent
  belongs to Tenant
  references actor and target entity
```

## Core Tables

- tenants
- users
- tenant_memberships
- client_organizations
- client_contacts
- service_lines
- engagements
- projects
- requirements
- deliverables
- milestones
- tasks
- approvals
- file_assets
- file_versions
- file_access_grants
- notifications
- notification_preferences
- audit_events
- templates
- comments

## Multi-Tenant Rules

- Every business table must include `tenant_id`.
- Cross-tenant queries must be forbidden by application policy.
- Tenant-level indexes should lead with `tenant_id`.
- Public IDs should be opaque and non-sequential.
- Audit events should record tenant, actor, action, target type, target ID, and timestamp.

## Indexing Strategy

Recommended index families:

- `(tenant_id, status)` for lifecycle views.
- `(tenant_id, client_organization_id)` for client workspaces.
- `(tenant_id, engagement_id)` for engagement-scoped records.
- `(tenant_id, project_id)` for project-scoped records.
- `(tenant_id, created_at)` for activity feeds.
- `(tenant_id, due_at)` for reminders and schedules.
- `(tenant_id, actor_id, created_at)` for audit filtering.
- Unique constraints scoped by tenant where names or slugs are user-defined.

## Deletion Strategy

- Prefer soft deletion for business records.
- Hard-delete ephemeral drafts after retention windows.
- Preserve audit events even when business records are archived.
- File deletion should use a retention-safe delete marker before object removal.

## Relationship Design Notes

- Requirements should support flexible JSON metadata by service line, but core fields must remain queryable.
- File assets should not be tied only to projects because branding, marketing, legal, and client-level records may not have projects.
- Engagements are the commercial delivery unit; projects are optional execution structures.
- Permissions should be represented separately from role names to allow tenant customization.
