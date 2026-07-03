# VPS Blocker Report

## Status

Resolved for Sprint 39C. SSH port 22 was intermittent during deploy retry, but it recovered after a short wait and the hardened deploy completed successfully.

## Final Result

- Shared old VPS used: yes
- Host: `45.10.x.x`
- Deploy user: `trustfirst`
- Host-key verified: yes
- Trusted fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Known_hosts repaired: yes
- Known_hosts backup: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260703073651`
- SSH access passed: yes
- Bootstrap completed: yes
- Deployment attempted: yes for Sprint 39C
- Deployment result: succeeded after SSH port 22 recovered
- Deployed commit: `a84cfd0e30b39d63d0e9f3f02c63dacc17f280ec`
- App URL: `http://45.10.21.141:3010`
- App port: `3010`
- DB status: `trustfirst_demo` database and user configured
- Migration status: all 9 migrations applied
- Seed status: `seed:manglam-demo` completed
- Smoke status: passed externally after deploy warm-up
- Intake smoke status: passed, `PUB-REQ-2026-0010`
- Authenticated QA status: protected routes remain locked for public traffic; internal QA route check passed through smoke
- CafeLuxe untouched: yes
- Final demo readiness: ready for public HTTP staging intake QA only

## Resolved Blockers

- Host-key mismatch was resolved through trusted fingerprint verification, a targeted `known_hosts` backup, and repair.
- SSH authorization was resolved by using the dedicated TrustFirst deploy key for user `trustfirst`.
- GitHub clone deployment was replaced with a tracked-source archive upload because the remote repository currently has no visible `origin/main` head.
- UFW blocked port `3010`; only `3010/tcp` was opened for TrustFirst.
- Prisma workspace resolution and migration status handling were corrected for VPS deployment.

## Sprint 39C Resolution

- Root cause: live Next.js runtime still served the older thank-you build even though the VPS source tree contained Sprint 39 receipt-loading code.
- Fix: deploy script now prints explicit step output, writes `.trustfirst-deployed-commit`, rebuilds, restarts only `trustfirst-client-portal`, and reports the deployed commit hash.
- `npm run vps:validate` output is redacted and no longer prints PM2 env values.
- `npm run intake:smoke` result: passed against the live VPS and verified `PUB-REQ-2026-0010`.
- Remaining operational note: staging secrets should be rotated using `STAGING_SECRET_ROTATION_NOTE.md` because older local validation output exposed staging env values.

## Remaining Notes

A real HTTPS domain/reverse proxy should be added before a polished client-facing browser demo because production Auth.js cookies are intentionally secure.
