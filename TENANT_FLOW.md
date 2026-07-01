# Tenant Flow

The multi-tenant core is built around tenant entities, memberships, invitations, tenant-aware sessions, and permission resolution.

## Tenant Resolution

Requests can identify tenant context through:

- `x-tenant-id` header
- host/subdomain resolver
- authenticated session active tenant

Tenant membership validation is performed server side. Proxy route protection is a coarse gate only; services and route handlers must still validate tenant access.

## Membership

`TenantMembership` connects users to tenants through roles. Only active memberships on active or trial tenants can be used for access.

Tenant context returned by `TenantApplicationService` contains:

- active tenant
- all accessible memberships
- role keys for authorization
- branding and settings contracts

## Tenant Switching

Tenant switching validates that the authenticated user has an active membership in the target tenant and that the tenant is active or trial. Successful switches update the session tenant reference and emit a tenant-switched audit event.

## Invitations

`TenantInvitationService` issues secure invitation tokens, stores only token hashes, and accepts invitations into tenant memberships. Invitations expire and can be extended later with email delivery without changing membership contracts.

## Branding, Settings, And Status

Tenant branding and settings are stored as JSON contracts to support future theming and tenant preferences without adding business modules. Tenant status controls access at the service layer.

