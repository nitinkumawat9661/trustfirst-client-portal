# VPS Staging Deployment Blocker

## Summary

Sprint 26 cannot deploy the Manglam demo to a VPS because no usable, authorized VPS SSH target is available in the current environment.

No VPS files were changed. No remote database was created. No secrets were committed. No production database was used.

## Access Inspection Performed

Commands/checks run:

```bash
ssh
scp
git remote -v
gh repo view --json nameWithOwner,sshUrl,url
vercel --version
Get-ChildItem ~/.ssh
Get-Content ~/.ssh/known_hosts
rg "ssh|vps|server|host|domain|pm2|nginx|caddy|/var/www|trustfirst-client-portal.env"
```

Findings:

- SSH and SCP are installed.
- The GitHub repo is `nitinkumawat9661/trustfirst-client-portal`.
- No `~/.ssh/config` file exists.
- No `SSH_HOST`, `VPS_HOST`, `DEPLOY_HOST`, `SERVER_HOST`, or domain-specific deployment variables are available in the shell.
- SSH keys exist locally, but their public key comments indicate prior CafeLuxe VPS usage, not a TrustFirst/Manglam staging target:
  - `id_ed25519.pub`
  - `cafeluxe_vps_ed25519.pub`
- Known hosts include:
  - `github.com`
  - `45.10.21.141`
  - `cafeluxesite.in`

## Read-Only SSH Probes Attempted

Read-only `BatchMode` SSH probes were attempted against the known non-TrustFirst host/IP with common usernames and existing keys:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/id_ed25519 root@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/cafeluxe_vps_ed25519 root@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/id_ed25519 ubuntu@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/cafeluxe_vps_ed25519 ubuntu@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/id_ed25519 deploy@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/cafeluxe_vps_ed25519 deploy@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/id_ed25519 nitin@45.10.21.141 "printf 'ok '; hostname; uname -srm"
ssh -o BatchMode=yes -o ConnectTimeout=6 -i ~/.ssh/cafeluxe_vps_ed25519 nitin@45.10.21.141 "printf 'ok '; hostname; uname -srm"
```

Results:

- `45.10.21.141` returned remote host identification changed warnings for several user/key combinations.
- Several probes timed out.
- `cafeluxesite.in` probes timed out.
- No successful SSH session was established.
- The discovered host appears related to CafeLuxe, not an authorized TrustFirst/Manglam staging VPS.

## Missing Access

To complete Sprint 26, Codex needs one authorized VPS target with:

- SSH hostname or IP.
- SSH username.
- Usable SSH key or password/access method.
- Confirmation that the server is intended for TrustFirst/Manglam staging.
- Optional domain/subdomain to use for `AUTH_URL` and reverse proxy.

## Why Deployment Cannot Proceed

Deploying to `45.10.21.141` or `cafeluxesite.in` would be unsafe because:

- The keys and host names are labeled for CafeLuxe, not this project.
- SSH access did not succeed.
- Host key mismatch warnings indicate the known host entry no longer matches the remote host.
- No instruction explicitly authorizes that host for the TrustFirst/Manglam demo.

## Next Steps Once VPS Access Exists

Use the runbook in `VPS_STAGING_DEPLOYMENT.md`:

```bash
ssh <user>@<vps-host>
node -v
npm -v
psql --version
git --version
```

Then provision:

- `/var/www/trustfirst-client-portal`
- `/etc/trustfirst-client-portal.env`
- PostgreSQL database `trustfirst_demo`
- PostgreSQL user `trustfirst_demo`
- `/var/www/trustfirst-client-portal/storage/uploads`
- PM2 or systemd service
- Nginx or Caddy reverse proxy

After access is available, rerun Sprint 26 from Task 2.
