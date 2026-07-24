# TrustFirst Runtime Health

## Purpose

TrustFirst Client Portal runs as the isolated PM2 process `trustfirst-client-portal` on port `3010`. The `pm2-trustfirst.service` systemd unit restores the saved TrustFirst process list after a VPS reboot and restarts the TrustFirst PM2 daemon after a failure.

The setup does not manage, restart, inspect, or modify CafeLuxe processes, files, databases, reverse proxy configuration, or port `3000`.

## Outage And Restoration

The public intake outage occurred because the `trustfirst-client-portal` process was absent from the `trustfirst` PM2 daemon. Nothing was listening on port `3010`; UFW already allowed `3010/tcp`.

The runtime was restored by starting only `trustfirst-client-portal`, saving `/home/trustfirst/.pm2/dump.pm2`, and installing the TrustFirst-owned PM2 systemd startup service.

## Persistence

- PM2 user: `trustfirst`
- PM2 process: `trustfirst-client-portal`
- Saved process list: `/home/trustfirst/.pm2/dump.pm2`
- Systemd service: `pm2-trustfirst.service`
- Startup state: enabled
- Runtime state: active
- Application port: `3010`
- PM2 process auto-restart: enabled

The PM2 daemon was reconciled under systemd after installation so the service owns the running TrustFirst daemon. A controlled `pm2-trustfirst.service` restart successfully resurrected the saved process and restored port `3010`.

## Health Command

Run from the repository:

```bash
npm run runtime:health
```

The command uses the verified `.env.deploy.local` SSH target and fails unless:

- the `trustfirst` PM2 account contains exactly one expected process and it is online
- PM2 auto-restart is enabled
- `pm2-trustfirst.service` is active and enabled
- port `3010` is listening
- the public Manglam intake returns HTTP `200`
- `/api/auth/session` returns HTTP `200`
- an anonymous protected admin request is redirected or denied

The probe never reads or prints deployment secrets.

## Recovery

Use the systemd-managed TrustFirst service:

```bash
sudo systemctl restart pm2-trustfirst.service
sudo systemctl status pm2-trustfirst.service --no-pager
sudo -iu trustfirst pm2 status
```

Do not restart a different PM2 user, process manager, application, reverse proxy, or port.

## Verification

- Runtime health: passed
- Systemd restart and PM2 resurrection: passed
- VPS smoke: passed
- Public intake smoke: passed, `PUB-REQ-2026-0014`
- Public intake: HTTP `200`
- Auth.js session endpoint: HTTP `200`
- Route lockdown: preserved, anonymous admin request returned `307`
- CafeLuxe untouched: yes
