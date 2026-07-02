# VPS Blocker Report

## Shared Old VPS Deployment Blocker

Sprint 32 configured the trusted ED25519 host fingerprint and repaired `known_hosts`, but deployment remains blocked because strict SSH authentication fails for `root@45.10.21.141` with the available private keys.

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
root@45.10.21.141: Permission denied (publickey).
```

`VPS_HOST_KEY_VERIFICATION.md` was generated with decision `trusted fingerprint matched; strict SSH authentication failed`.

Evidence collected:

- DNS/IP result: `45.10.21.141 (IPv4)`
- Existing known_hosts ED25519 fingerprint: `SHA256:WOrGpBngyEQismYclNOX1KU/Dfy2A+uwJDjCAXxM464`
- Existing known_hosts RSA fingerprint: `SHA256:GSfOPFTaILBNtEstYu0W5Zq0TdHG4Gtg3i/quLWHGks`
- Existing known_hosts ECDSA fingerprint: `SHA256:ZWwcfBYIFIMoCekQg5I2CGNsnSC1B41smvKn1d+84kA`
- Current ED25519 fingerprint: `SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`
- Current RSA fingerprint: `SHA256:U/yYcVMljDyvORobFkagh5xyj+XmVLeed8MQt/MlwmY`
- Current ECDSA fingerprint: `SHA256:xTzBtiL+q/EsSR3/2buZioRuZl/z64QeXJJjvJe86vA`
- ssh-keyscan error: `choose_kex: unsupported KEX method sntrup761x25519-sha512@openssh.com`
- Strict SSH result: host key accepted, authentication failed with `Permission denied (publickey)`
- Fallback private key check: `~/.ssh/id_ed25519` also failed with `Permission denied (publickey)`

## Required Manual Verification

Codex must not bypass this with `StrictHostKeyChecking=no`.

Before deployment can continue, the VPS owner/provider must provide SSH access that authorizes the configured user/key, or provide the correct `DEPLOY_USER` and private key for this VPS. The trusted fingerprint gate is already configured locally:

```bash
DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes
DEPLOY_ALLOW_SHARED_OLD_VPS=yes
DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0
```

Then run:

```bash
npm run vps:host-key
npm run vps:validate
```

Only continue to bootstrap/deploy after strict SSH validation succeeds.

## Additional Missing Deployment Input

No additional deployment input should be committed. `.env.deploy.local` exists locally and is intentionally ignored by git.
