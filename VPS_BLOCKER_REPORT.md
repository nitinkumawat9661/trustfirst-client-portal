# VPS Blocker Report

## Status

Partially reopened for Sprint 39. The previous SSH authorization blocker was cleared after the VPS owner added the TrustFirst deploy public key to user `trustfirst`, but the Sprint 39 deploy retry is currently blocked because port 22 timed out from this workstation.

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
- Deployment attempted: yes for Sprint 39
- Deployment result: blocked before remote changes, archive upload failed with SSH timeout
- App URL: `http://45.10.21.141:3010`
- App port: `3010`
- DB status: `trustfirst_demo` database and user configured
- Migration status: all 9 migrations applied
- Seed status: `seed:manglam-demo` completed
- Smoke status: Sprint 39 intake smoke failed against the live VPS because the previous deployment is still active
- Authenticated QA status: not rerun after Sprint 39 because deployment did not complete
- CafeLuxe untouched: yes
- Final demo readiness: previous staging build remains reachable; Sprint 39 confirmation hardening is not live yet

## Resolved Blockers

- Host-key mismatch was resolved through trusted fingerprint verification, a targeted `known_hosts` backup, and repair.
- SSH authorization was resolved by using the dedicated TrustFirst deploy key for user `trustfirst`.
- GitHub clone deployment was replaced with a tracked-source archive upload because the remote repository currently has no visible `origin/main` head.
- UFW blocked port `3010`; only `3010/tcp` was opened for TrustFirst.
- Prisma workspace resolution and migration status handling were corrected for VPS deployment.

## Current Sprint 39 Blocker

- Command blocked: `npm run vps:deploy`
- Error: `ssh: connect to host 45.10.21.141 port 22: Connection timed out`
- Follow-up host-key retry: blocked because `ssh-keyscan` did not return a usable host key.
- HTTP app health check: still returned `200`, so the previously deployed app is running.
- `npm run intake:smoke` result: failed on the thank-you business-name marker, confirming Sprint 39 is not live.
- Required next action: restore SSH access/reachability to `45.10.21.141:22`, then rerun the verified VPS deploy flow.

## Remaining Notes

A real HTTPS domain/reverse proxy should be added before a polished client-facing browser demo because production Auth.js cookies are intentionally secure.
