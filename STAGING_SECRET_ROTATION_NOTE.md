# Staging Secret Rotation Note

## Reason

Earlier VPS validation output printed PM2 environment values for the TrustFirst staging process. That output could expose sensitive staging-only values in local logs.

The validation script has been hardened so `npm run vps:validate` no longer prints PM2 env values. It reports only whether expected keys are present and marks sensitive keys as redacted.

## Rotate These TrustFirst Staging Values

Rotate only TrustFirst staging secrets:

- `DATABASE_URL` password for PostgreSQL user `trustfirst_demo`
- `AUTH_SECRET`
- `MANGLAM_DEMO_ADMIN_PASSWORD`

Optionally rotate:

- Manglam demo admin email if it needs to change for staging access hygiene

Do not rotate or touch CafeLuxe secrets.

## Manual Rotation Plan

Use a trusted SSH session to the authorized TrustFirst deploy user and update only:

```text
/etc/trustfirst-client-portal.env
```

Then restart only:

```text
trustfirst-client-portal
```

After rotation, rerun:

```bash
npm run vps:validate
npm run vps:smoke
SMOKE_BASE_URL=http://45.10.21.141:3010 npm run intake:smoke
```

## Boundaries

- Do not rotate CafeLuxe database credentials.
- Do not touch CafeLuxe files.
- Do not touch CafeLuxe PM2 process.
- Do not touch CafeLuxe Nginx/Caddy config.
- Do not use production client data.

Secret rotation is intentionally documented for a follow-up operational sprint instead of being performed automatically here.
