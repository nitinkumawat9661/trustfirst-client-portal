# HTTP Staging Auth Bypass Note

## Status

Temporary HTTP staging auth bypass is available only for:

```text
http://45.10.21.141:3010
```

## Why This Exists

Browser sign-in remains unreliable for staging QA on the direct HTTP IP URL. PM2 logs show the earlier Auth.js `MissingCSRF` failure from secure production cookies over plain HTTP. The credentials are valid, but the user requested sign-in removal for this staging demo.

## Guard

Auth bypass is active only when all conditions are true:

- `NODE_ENV=production`
- `AUTH_URL=http://45.10.21.141:3010`
- `TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS=yes`
- `DEPLOY_ALLOW_SHARED_OLD_VPS=yes`
- Request host is exactly `45.10.21.141:3010`

When active, the central session helper returns the seeded Manglam demo admin user for tenant `manglam-trading-demo`. Tenant scoping and permission checks still use the real demo tenant membership.

## Rollback

After HTTPS/domain setup:

1. Remove `TRUSTFIRST_HTTP_STAGING_AUTH_BYPASS=yes` from `/etc/trustfirst-client-portal.env`.
2. Remove `TRUSTFIRST_HTTP_STAGING_LOGIN=yes` from `/etc/trustfirst-client-portal.env`.
3. Set `AUTH_URL=https://<domain>`.
4. Set `NEXTAUTH_URL=https://<domain>`.
5. Restart only `trustfirst-client-portal` with `pm2 restart trustfirst-client-portal --update-env`.
6. Re-run HTTPS smoke and authenticated QA.

Never use this setting for production clients.
