# HTTP Staging Login Note

## Status

Temporary HTTP staging login is enabled only for the direct VPS staging URL:

```text
http://45.10.21.141:3010
```

## Why This Exists

The staging deployment currently has no HTTPS domain. Auth.js production cookies are secure by default, so browser login over plain HTTP does not round-trip the CSRF/session cookies and fails with `MissingCSRF`.

The root cause was confirmed in PM2 logs as `MissingCSRF` during the Auth.js credentials callback while the app was running on plain HTTP with production secure cookies.

## Guard

Non-secure Auth.js cookies are allowed only when all conditions are true:

- `NODE_ENV=production`
- `TRUSTFIRST_HTTP_STAGING_LOGIN=yes`
- `AUTH_URL=http://45.10.21.141:3010`
- The configured Auth.js host is exactly `45.10.21.141:3010`

This does not apply to HTTPS domains and does not weaken production/domain deployments.

## Rollback

After HTTPS domain setup:

1. Remove `TRUSTFIRST_HTTP_STAGING_LOGIN=yes` from `/etc/trustfirst-client-portal.env`.
2. Set `AUTH_URL=https://<trustfirst-demo-domain>`.
3. Restart only `trustfirst-client-portal` with `pm2 restart trustfirst-client-portal --update-env`.
4. Re-run smoke and authenticated QA over HTTPS.

Do not use this setting for production clients.

For the temporary no-login demo path, see `HTTP_STAGING_AUTH_BYPASS_NOTE.md`. Remove both HTTP staging env gates after HTTPS is configured.
