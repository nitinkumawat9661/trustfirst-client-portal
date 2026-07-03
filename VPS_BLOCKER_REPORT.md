# VPS Blocker Report

## Status

Resolved. The previous SSH authorization blocker was cleared after the VPS owner added the TrustFirst deploy public key to user `trustfirst`.

## Final Result

- Shared old VPS used: yes
- Host: `45.10.x.x`
- Deploy user: `trustfirst`
- Host-key verified: yes
- Trusted fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Known_hosts repaired: yes
- Known_hosts backup: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260703010214`
- SSH access passed: yes
- Bootstrap completed: yes
- Deployment attempted: yes
- Deployment result: succeeded
- App URL: `http://45.10.21.141:3010`
- App port: `3010`
- DB status: `trustfirst_demo` database and user configured
- Migration status: all 9 migrations applied
- Seed status: `seed:manglam-demo` completed
- Smoke status: passed externally
- Authenticated QA status: passed
- CafeLuxe untouched: yes
- Final demo readiness: deployed and ready for staging QA

## Resolved Blockers

- Host-key mismatch was resolved through trusted fingerprint verification, a targeted `known_hosts` backup, and repair.
- SSH authorization was resolved by using the dedicated TrustFirst deploy key for user `trustfirst`.
- GitHub clone deployment was replaced with a tracked-source archive upload because the remote repository currently has no visible `origin/main` head.
- UFW blocked port `3010`; only `3010/tcp` was opened for TrustFirst.
- Prisma workspace resolution and migration status handling were corrected for VPS deployment.

## Remaining Notes

No deployment blocker remains for staging QA. A real HTTPS domain/reverse proxy should be added before a polished client-facing browser demo because production Auth.js cookies are intentionally secure.
