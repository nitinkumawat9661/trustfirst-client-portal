# VPS Blocker Report

## Shared Old VPS Deployment Blocker

Sprint 30 created `.env.deploy.local` for the authorized old shared VPS and collected safe host-key evidence, but deployment remains blocked because the current server host key could not be collected as usable key material and no trusted fingerprint gate is configured.

No VPS files were changed. No remote database was created. No secrets were committed. No CafeLuxe process, files, database, or Nginx config were modified.

## Status

- Shared old VPS used: no
- `.env.deploy.local` created: yes
- Host: 45.10.x.x
- Host-key status: not verified
- Key path exists: yes
- Current fingerprint collected: no
- Trusted fingerprint configured: no
- Known_hosts repaired: no
- App path: `/var/www/trustfirst-client-portal`
- Env path: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- CafeLuxe untouched: yes
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: BLOCKED

## Checks Performed

Host-key verification command:

```bash
npm run vps:host-key
```

Result:

```text
Host-key verification blocked: ssh-keyscan did not return a usable host key.
```

`VPS_HOST_KEY_VERIFICATION.md` was generated with decision `not verified`.

Evidence collected:

- DNS/IP result: `45.10.21.141 (IPv4)`
- Existing known_hosts ED25519 fingerprint: `SHA256:WOrGpBngyEQismYclNOX1KU/Dfy2A+uwJDjCAXxM464`
- Existing known_hosts RSA fingerprint: `SHA256:GSfOPFTaILBNtEstYu0W5Zq0TdHG4Gtg3i/quLWHGks`
- Existing known_hosts ECDSA fingerprint: `SHA256:ZWwcfBYIFIMoCekQg5I2CGNsnSC1B41smvKn1d+84kA`
- Current ssh-keyscan fingerprint: not collected
- ssh-keyscan error: `choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com`
- Strict SSH result: connection timed out

## Required Manual Verification

Codex must not bypass this with `StrictHostKeyChecking=no`.

Before deployment can continue, the VPS owner/provider must supply or confirm the current host fingerprint through a trusted channel. Then set one trusted host-key gate in `.env.deploy.local`:

```bash
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
DEPLOY_ALLOW_SHARED_OLD_VPS=yes
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=<trusted-sha256-fingerprint>
```

or, if the VPS owner has accepted the current fingerprint out-of-band:

```bash
DEPLOY_HOST_KEY_VERIFIED=yes
```

If the local `ssh-keyscan` still cannot collect key material, update the local OpenSSH client or run the same evidence collection from a machine whose `ssh-keyscan` supports the server KEX. Then run:

```bash
npm run vps:host-key
npm run vps:validate
```

Only continue to bootstrap/deploy after `vps:host-key` repairs `known_hosts` from verified key material and strict SSH validation succeeds.

## Additional Missing Deployment Input

No additional deployment input should be committed. `.env.deploy.local` exists locally and is intentionally ignored by git.
