# VPS Staging Deployment Runbook

## Scope

This runbook deploys TrustFirst Client Portal as a VPS-hosted Manglam demo environment. It does not use Vercel, Neon, production client data, or live payment gateways.

The authorized old shared VPS may be used only as an isolated TrustFirst section. Do not overwrite, delete, restart, or modify any existing CafeLuxe app, database, Nginx/Caddy config, PM2 process, files, or port `3000`.

## Current Deployment

- Status: deployed
- URL: `http://45.10.21.141:3010`
- HTTPS demo URL: blocked, no domain configured
- HTTP staging login: enabled by explicit env gate
- HTTP staging auth bypass: enabled by explicit env gate
- Deploy user: `trustfirst`
- App path: `/var/www/trustfirst-client-portal`
- Env file: `/etc/trustfirst-client-portal.env`
- Database: `trustfirst_demo`
- Database user: `trustfirst_demo`
- PM2 process: `trustfirst-client-portal`
- App port: `3010`
- Host-key verified: yes
- Known_hosts repaired: yes
- External smoke: passed
- Authenticated QA: passed
- CafeLuxe untouched: yes
- Final demo readiness: READY FOR HTTP STAGING QA ONLY

## Standard Command Flow

```bash
npm run vps:host-key
npm run vps:validate
npm run vps:bootstrap
npm run vps:deploy
npm run vps:smoke
npm run vps:report
```

## Required Inputs

- `.env.deploy.local` exists locally and is ignored by git.
- `DEPLOY_HOST=45.10.21.141`
- `DEPLOY_USER=trustfirst`
- `DEPLOY_PORT=22`
- `DEPLOY_KEY_PATH=%USERPROFILE%\.ssh\trustfirst_vps_ed25519`
- `DEPLOY_APP_PORT=3010`
- `DEPLOY_APP_DIR=/var/www/trustfirst-client-portal`
- `DEPLOY_ENV_FILE=/etc/trustfirst-client-portal.env`
- `DEPLOY_CONFIRM_TRUSTFIRST_MANGLAM=yes`
- `DEPLOY_ALLOW_SHARED_OLD_VPS=yes`
- `DEPLOY_TRUSTED_HOST_FINGERPRINT_SHA256=SHA256:w8MD7ergBNR3mKezePOVLyxvn/C/cFmBtWCUrC+p7W0`

Do not commit `.env.deploy.local` or private keys.

## Server Requirements

Verified on the VPS:

- Node.js v22.23.0
- npm 10.9.8
- PostgreSQL 14.23
- Git 2.34.1
- Nginx installed, not modified for TrustFirst because no domain is configured
- PM2 installed for user `trustfirst`
- UFW active with `3010/tcp` allowed for TrustFirst

## Migrations And Seed

Completed:

- `npm run deploy:env`
- `npm run db:generate`
- `npm run deploy:migration-check`
- `npm run deploy:migration-check -- --apply`
- `npm run seed:manglam-demo`

Applied migrations:

- `20260701172500_auth_multi_tenant_core`
- `20260701193000_crm_client_workspace`
- `20260702093000_requirement_engine`
- `20260702113000_project_engine`
- `20260702143000_commercial_document_engine`
- `20260702160000_billing_invoice_payment_foundation`
- `20260702173000_hardware_erp_plugin_foundation`
- `20260702190000_hardware_sales_purchase_flow`
- `20260702203000_hardware_demo_readiness`

Seed verification:

- Tenant slug: `manglam-trading-demo`
- Products: 8
- Stock locations: 2
- Clients: 6
- Hardware trade documents: 3
- Invoices: 0

## Smoke Test

External smoke passed:

```bash
npm run vps:smoke
```

Checked:

- `/api/auth/session`
- `/manifest.webmanifest`
- `/offline`
- `/admin/hardware/demo`
- `/admin/billing`
- `/admin/hardware/inventory`
- `/admin/hardware/print/sample`

## Sprint 35 Domain Status

- Domain configured: no
- DNS resolves to `45.10.21.141`: no, not checked because `DEPLOY_DOMAIN` is empty
- Nginx TrustFirst site created: no
- HTTPS certificate issued: no
- AUTH_URL updated to HTTPS domain: no
- PM2 restarted for HTTPS domain: no
- HTTPS smoke passed: no
- HTTP staging smoke passed: yes
- HTTP staging login enabled: yes
- HTTP staging auth bypass enabled: yes
- Sign-in removed for HTTP staging: yes
- Login status: passed
- Admin pages open without login: yes
- Authenticated QA over HTTPS: no
- Manglam full demo QA over HTTPS: no
- Manglam full demo QA over HTTP staging: passed
- CafeLuxe untouched: yes

Required DNS record:

```text
demo.trustfirstsolutions.in A 45.10.21.141
```

## Authenticated QA

Authenticated QA passed using the generated Manglam demo admin credentials from the VPS env file without printing the password.

Protected pages returned `200`:

- `/admin/hardware/demo/manglam`
- `/admin/hardware/products`
- `/admin/hardware/inventory`
- `/admin/billing`
- `/admin/release-checklist`

## Demo QA Walkthrough

Open:

- `/admin/release-checklist`
- `/admin/hardware/demo`
- `/admin/hardware/demo/manglam`
- `/admin/hardware/products`
- `/admin/hardware/inventory`
- `/admin/hardware/sales/new`
- `/admin/billing`
- `/offline`
- `/manifest.webmanifest`

Then verify:

1. Settings ready.
2. Catalog ready.
3. Opening stock ready.
4. Create quotation.
5. Convert quotation to sale.
6. Confirm stock deduction.
7. Invoice draft created.
8. A4 print preview opens.
9. Manual payment records.
10. Outstanding updates.
11. Offline queue panel visible.

## HTTPS Note

The current direct staging URL is HTTP on an IP/port. Configure a TrustFirst domain with HTTPS before a polished client-facing browser login demo. Do not reuse or overwrite the existing CafeLuxe Nginx site.

Temporary HTTP login rollback is documented in `HTTP_STAGING_LOGIN_NOTE.md`.

Temporary no-login auth bypass rollback is documented in `HTTP_STAGING_AUTH_BYPASS_NOTE.md`.
