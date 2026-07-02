# VPS Blocker Report

## Shared Old VPS Deployment Blocker

Sprint 33 probed existing local SSH users/keys with strict host checking. No existing key/user combination authorized successfully, so a dedicated TrustFirst deploy key was generated and a public-key access request was created.

No VPS files were changed. No remote database was created. No secrets were committed. No CafeLuxe process, files, database, or Nginx config were modified.

## Status

- Shared old VPS used: no
- `.env.deploy.local` created: yes
- Host: 45.10.x.x
- Host-key status: trusted fingerprint matched
- Key path exists: yes
- Current fingerprint collected: yes
- Trusted fingerprint configured: yes
- Trusted fingerprint used: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Known_hosts repaired: yes
- Known_hosts backup: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260702181522`
- Strict SSH validation passed: no
- SSH auth probes attempted: yes
- Working user/key found: no
- Deploy key generated: yes
- Public key request created: yes
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

SSH authorization probes:

Users tested: `root`, `ubuntu`, `deploy`, `admin`, `nitin`, `trustfirst`, `cafeluxe`.

Keys tested:

- `%USERPROFILE%\.ssh\cafeluxe_vps_ed25519`
- `%USERPROFILE%\.ssh\id_ed25519`

Result: no authorized SSH login found. Several probes reached SSH and failed with `Permission denied (publickey)`; later probes timed out on port `22`.

Evidence collected:

- DNS/IP result: `45.10.21.141 (IPv4)`
- Existing known_hosts ED25519 fingerprint: `SHA256:WOrGpBngyEQismYclNOX1KU/Dfy2A+uwJDjCAXxM464`
- Existing known_hosts RSA fingerprint: `SHA256:GSfOPFTaILBNtEstYu0W5Zq0TdHG4Gtg3i/quLWHGks`
- Existing known_hosts ECDSA fingerprint: `SHA256:ZWwcfBYIFIMoCekQg5I2CGNsnSC1B41smvKn1d+84kA`
- Current ED25519 fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Current RSA fingerprint: `SHA256:U/yYcVMljDyvORobFkagh5xyj+XmVLeed8MQt/MlwmY`
- Current ECDSA fingerprint: `SHA256:xTzBtiL+q/EsSR3/2buZioRuZl/z64QeXJJjvJe86vA`
- ssh-keyscan error: `choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com`
- Strict SSH result: host key accepted, authentication failed or timed out during user/key probes
- Fallback private key check: `~/.ssh/id_ed25519` did not authorize any tested user
- New deploy key public request: `VPS_SSH_ACCESS_REQUEST.md`

## Required Manual Verification

Codex must not bypass this with `StrictHostKeyChecking=no`.

Before deployment can continue, the VPS owner/provider must add the public key from `VPS_SSH_ACCESS_REQUEST.md` to an authorized deploy user, preferably `trustfirst` or `deploy`. The trusted fingerprint gate is already configured locally:

```bash
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
DEPLOY_ALLOW_SHARED_OLD_VPS=yes
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0
```

Then run:

```bash
DEPLOY_USER=trustfirst
DEPLOY_KEY_PATH=%USERPROFILE%\.ssh\trustfirst_vps_ed25519
npm run vps:host-key
npm run vps:validate
```

Only continue to bootstrap/deploy after strict SSH validation succeeds.

## Additional Missing Deployment Input

No additional deployment input should be committed. `.env.deploy.local` exists locally and is intentionally ignored by git.
