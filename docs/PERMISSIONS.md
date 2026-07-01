# Permissions Architecture

## Principle

Permissions must be explicit, composable, and evaluated by tenant, role, scope, ownership, and object state.

## Permission Scopes

- Platform
- Tenant
- Client organization
- Engagement
- Project
- File asset
- Approval
- Notification
- Audit event

## Permission Groups

### Tenant Administration

- `tenant.view`
- `tenant.update`
- `tenant.security.manage`
- `tenant.billing.view`
- `tenant.members.invite`
- `tenant.members.manage`
- `tenant.templates.manage`

### Client Management

- `client.view`
- `client.create`
- `client.update`
- `client.archive`
- `client.contacts.manage`
- `client.lifecycle.update`

### Engagement Management

- `engagement.view`
- `engagement.create`
- `engagement.update`
- `engagement.archive`
- `engagement.lifecycle.update`
- `engagement.commercial.view`

### Project Management

- `project.view`
- `project.create`
- `project.update`
- `project.archive`
- `project.timeline.manage`
- `project.status.update`

### Requirements

- `requirement.view`
- `requirement.create`
- `requirement.update`
- `requirement.submit`
- `requirement.review`
- `requirement.approve`
- `requirement.reject`

### Files

- `file.view`
- `file.upload`
- `file.update`
- `file.version.create`
- `file.share`
- `file.delete`
- `file.restore`

### Approvals

- `approval.view`
- `approval.request`
- `approval.respond`
- `approval.override`

### Notifications

- `notification.view`
- `notification.preferences.manage`
- `notification.rules.manage`

### Audit

- `audit.view`
- `audit.export`

## Access Evaluation

Access should be evaluated in this order:

1. Confirm tenant membership or valid scoped external access.
2. Confirm object belongs to the tenant.
3. Confirm user has role or direct grant for the object scope.
4. Confirm object state allows the action.
5. Confirm no explicit deny applies.
6. Record meaningful audit events for sensitive actions.

## Explicit Denies

Explicit denies should override inherited permissions for:

- Confidential files
- Finance records
- Legal documents
- Sensitive HR or compliance records
- Client-only or internal-only communications

## Permission Design Rules

- Do not hard-code business decisions only into UI visibility.
- Server-side enforcement must exist for every protected action when backend logic is introduced.
- Permissions should support tenant customization without code changes.
- Client users must never infer or enumerate other client organizations.
- External collaborators should have narrow, expiring access grants.
