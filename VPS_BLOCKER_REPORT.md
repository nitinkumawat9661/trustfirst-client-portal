# VPS Blocker Report

## Shared Old VPS Deployment Blocker

Sprint 28 cannot deploy TrustFirst to the authorized old shared VPS yet because strict SSH host-key verification fails for the previously discovered VPS IP.

No VPS files were changed. No remote database was created. No secrets were committed. No CafeLuxe process, files, database, or Nginx config were modified.

## Status

- Shared old VPS used: no
- Host: 45.10.x.x
- Host-key status: blocked - remote host identification changed
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

Known host lookup:

```bash
ssh-keygen -F 45.10.21.141
```

Result:

- `45.10.21.141` exists in local `known_hosts`.
- Entries were found on lines 3, 4, and 5.

Strict read-only SSH probe:

```bash
ssh -p 22 -i ~/.ssh/cafeluxe_vps_ed25519 -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes root@45.10.21.141 "hostname && uname -a"
```

Result:

```text
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
The fingerprint for the ED25519 key sent by the remote host is SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0.
Offending ECDSA key in C:\Users\DELL/.ssh/known_hosts:5
Host key for 45.10.21.141 has changed and you have requested strict checking.
Host key verification failed.
```

## Required Manual Verification

Codex must not bypass this with `StrictHostKeyChecking=no`.

Before deployment can continue, the VPS owner must verify the new fingerprint out-of-band. If the fingerprint is expected, run:

```bash
ssh-keygen -F 45.10.21.141
ssh-keygen -R 45.10.21.141
ssh-keyscan -p 22 45.10.21.141 >> ~/.ssh/known_hosts
ssh -p 22 -i ~/.ssh/cafeluxe_vps_ed25519 -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes root@45.10.21.141 "hostname && uname -a"
```

Only continue if the final strict SSH command succeeds and the server owner confirms this is the authorized shared old VPS for the TrustFirst/Manglam demo.

## Additional Missing Deployment Input

`.env.deploy.local` is not present in the repository workspace. After the host key is verified, create it from `.env.deploy.example` with the authorized host, user, key path, optional domain, and required shared VPS confirmations.
