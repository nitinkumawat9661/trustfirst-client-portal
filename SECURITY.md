# Security Architecture

TrustFirst Client Portal uses layered controls across Proxy, route handlers, services, repositories, database constraints, CI, backups, and VPS deployment.

## Application controls

- Auth.js cookies use `httpOnly`, `sameSite=lax`, and production-only `secure` flags.
- Production sessions expire after 12 hours and are revoked when the user, tenant membership, role permissions, or session version is no longer valid.
- Login permissions are resolved from one active tenant membership only. Permissions from another tenant are never merged into the active session.
- Production rejects unknown hostnames instead of exposing legacy routes through direct IP or forged Host headers.
- Mangalam hardware APIs require authentication at Proxy and server-service layers.
- Custom mutating APIs use canonical same-origin and Fetch Metadata CSRF validation.
- Request IDs, correlation IDs, user agents, and proxy IP headers are length-limited and validated before logging or rate-limit use.
- Password reset and email verification requests return indistinguishable responses to prevent account enumeration and are rate limited by account and proxy-observed IP.
- Content Security Policy nonces are propagated through both request and response headers before Next.js rendering.
- HSTS, clickjacking protection, MIME sniffing protection, restrictive referrer policy, permissions policy, and cross-origin isolation headers are enabled.
- Sensitive API and sign-in responses are non-cacheable.
- Zod validation, input normalization, Argon2id password hashing, login throttling, account lockout, session-version revocation, device sessions, and audit events remain mandatory.

## Authorization rules

Authorization is permission based and tenant scoped:

- every protected data operation must validate the current tenant at the data-access or service layer
- Proxy checks are an additional boundary, not the sole authorization mechanism
- role or membership removal must revoke effective permissions on the next session validation
- ownership validation must prevent cross-tenant and cross-user resource access
- administrative password resets require an active membership and an explicit management permission or approved owner/admin role

## Deployment controls

Production deployment must fail when required authentication configuration is absent or unsafe:

- `AUTH_TRUST_HOST=true`
- HTTPS `AUTH_URL` and `NEXTAUTH_URL` on an approved canonical hostname
- strong, unique `AUTH_SECRET` with at least 32 characters, preferably 64 or more
- PostgreSQL accessible only from approved application hosts
- SSH key authentication and restricted VPS firewall rules
- encrypted off-VPS backups with automated restore verification
- dependency audit, lint, typecheck, tests, and production build before deployment

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, customer data, database contents, or production infrastructure information. Report privately to the repository owner with the affected route or commit, reproducible non-production steps, impact, and redacted evidence.

## Response order

1. Contain active exposure and rotate affected credentials.
2. Preserve audit evidence and identify affected tenants or records.
3. Patch through an isolated branch with regression tests.
4. Validate staging, backup restore, and production smoke checks.
5. Deploy with rollback available and monitor for recurrence.

Security controls reduce risk but cannot prove that software is permanently unhackable. New vulnerabilities, dependency issues, infrastructure mistakes, and credential compromise require ongoing updates, monitoring, and periodic authorized testing.
