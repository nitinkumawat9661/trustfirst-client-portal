# Authentication Flow

TrustFirst Client Portal uses Auth.js with credentials authentication, Argon2id password verification, JWT sessions, and server-side session-version revocation.

## Login

1. The credentials provider validates input with Zod.
2. `AuthenticationService` normalizes email and checks login rate limits.
3. The user account is loaded through `PrismaAuthRepository`.
4. Account state is enforced before password verification:
   - disabled and suspended accounts are rejected
   - locked accounts are rejected until the lockout window expires
   - unverified email accounts are rejected
5. Passwords are verified with Argon2id.
6. Failed attempts are recorded in `LoginHistory`; repeated failures lock the account.
7. Successful login resets failed counters, writes login history, records/updates a device session, and emits an audit event.
8. Auth.js issues a secure JWT session cookie.

## Sessions

JWT sessions carry user id, role, active tenant id, permissions, and session version. On each JWT callback, the user status and session version are checked from the database. `logoutAllDevices` increments `User.sessionVersion`, invalidating previously issued JWTs.

Auth.js manages CSRF protection for its built-in auth routes. Custom mutating routes enforce same-origin CSRF checks through `assertCsrfSafeRequest`.

## Password Lifecycle

Password reset and email verification are token based:

- raw tokens are generated with cryptographic randomness
- only SHA-256 token hashes are stored
- tokens are single use and expire
- password reset revokes all existing device sessions

No email provider is wired in this sprint. The services return token issuance state for future notification integration without adding external integrations.

## Device Sessions

Device sessions store user, tenant, device hash, user agent, IP address, last seen timestamp, and revocation state. They support account security screens and logout-all-devices behavior without coupling business modules to authentication internals.

