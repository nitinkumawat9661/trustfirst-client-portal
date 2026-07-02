# VPS Deployment Report

## Status

Sprint 32 configured the trusted ED25519 host fingerprint and repaired `known_hosts` safely. Deployment is still blocked because strict SSH authentication fails for `root@45.10.21.141` with the available private keys.

## Shared Old VPS Deployment

- Old VPS used: no
- `.env.deploy.local` created: yes
- Host masked: 45.10.x.x
- Host-key status: trusted fingerprint matched
- Key path exists: yes
- Current fingerprint collected: yes
- Trusted fingerprint configured: yes
- Trusted fingerprint used: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Known_hosts repaired: yes
- Backup path: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260702181522`
- Strict SSH validation passed: no
- App path: `/var/www/trustfirst-client-portal`
- Env path: `/etc/trustfirst-client-portal.env`
- DB name: `trustfirst_demo`
- DB user: `trustfirst_demo`
- App port: `3010`
- PM2 process: `trustfirst-client-portal`
- URL: not available
- CafeLuxe untouched: yes
- Deployment attempted: no
- Migrations applied: no
- Seed completed: no
- Smoke passed: no
- Authenticated QA passed: no
- Final demo readiness: NOT READY FOR CLIENT DEMO

## Validation Result

Host-key verification command:

```bash
npm run vps:host-key
```

Result: trusted fingerprint matched and `known_hosts` was repaired, but strict SSH authentication failed with `Permission denied (publickey)`.

Evidence:

- DNS/IP result: `45.10.21.141 (IPv4)`
- Existing known_hosts fingerprints collected: yes
- Current ssh-keyscan fingerprints collected: yes
- Current ED25519 fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Current RSA fingerprint: `SHA256:U/yYcVMljDyvORobFkagh5xyj+XmVLeed8MQt/MlwmY`
- Current ECDSA fingerprint: `SHA256:xTzBtiL+q/EsSR3/2buZioRuZl/z64QeXJJjvJe86vA`
- Windows ssh-keyscan error: `choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com`
- Git for Windows ssh-keyscan: succeeded once; later repeat scans timed out
- Strict SSH validation: not passed; both `cafeluxe_vps_ed25519` and `id_ed25519` were rejected for `root`

Because strict SSH validation failed, no VPS validation, bootstrap, database provisioning, deployment, migration, seed, smoke, or authenticated QA was attempted.

## Environment

- `.env.deploy.local`: created locally and ignored by git
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM`: required
- `DEPLOY_ALLOW_SHARED_OLD_VPS`: required
- `DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256`: configured locally, not committed
- `DEPLOY_APP_PORT`: must be `3010`
- Deployment env file on VPS: not created
- Storage directory on VPS: not created

## Database

- PostgreSQL setup: not performed
- Database `trustfirst_demo`: not created
- User `trustfirst_demo`: not created
- Migration status: not applied
- Seed status: not completed

## QA

- Smoke passed: no
- Authenticated QA passed: no
- Manglam demo QA passed: no
- Final demo readiness: BLOCKED

## Blocker

See `VPS_BLOCKER_REPORT.md` and `VPS_HOST_KEY_VERIFICATION.md`.
