# Security Architecture

TrustFirst Client Portal applies layered security across proxy, route handlers, services, repositories, and database constraints.

## Controls

- Secure Auth.js cookies with `httpOnly`, `sameSite=lax`, and production `secure` flags.
- Content Security Policy, frame protection, MIME sniffing protection, referrer policy, and permissions policy in `src/proxy.ts`.
- Same-origin CSRF validation for custom mutating API routes.
- Zod validation at route and credentials boundaries.
- Input normalization and string sanitization for auth inputs.
- Argon2id password hashing.
- Brute-force protection through rate limits, failed login counters, and account lockout.
- JWT session-version revocation for logout-all-devices.
- Request and correlation id propagation.
- Login history, device sessions, and audit events.

## Authorization

Authorization is permission based and tenant scoped:

- roles resolve to permissions
- permissions are cached briefly per tenant/user pair
- policy enforcement is server side
- ownership validation prevents cross-tenant or cross-user resource access

Proxy route protection is not the only authorization layer. Server-side validation remains mandatory for routes, server actions, and future business services.

## Database Security

The database schema includes indexes for security-sensitive lookups:

- normalized email
- user status and lockout
- session expiration and revocation
- tenant membership
- invitation token hash
- auth token hash and expiry
- login history by user, tenant, email, and time
- audit events by tenant, actor, action, target, and correlation id

## Operational Notes

`AUTH_SECRET` must be a high-entropy secret in every environment. Password reset and email verification tokens must be delivered only through trusted notification providers when integrations are added.

