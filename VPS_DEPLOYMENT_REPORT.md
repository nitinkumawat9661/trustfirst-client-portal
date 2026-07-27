# VPS Deployment Report

## Status

- Final deployed application SHA: `4e9b77bb3fef08c3a33a01d77b88e3d5de585750`
- GitHub `main` SHA at report time: `2a5ae4487c96bd148e8b1724323c3d5bccca1f76`
- Report-only local HEAD after deployment: `4e9b77bb3fef08c3a33a01d77b88e3d5de585750`
- Release directory: `/var/www/trustfirst-client-portal-releases/4e9b77bb3fef08c3a33a01d77b88e3d5de585750`
- Production PM2 process: `trustfirst-client-portal`
- Production port: `3010`
- Final readiness: READY FOR SUPERVISED CLIENT HANDOVER AND DAILY BILLING; physical printer paper output remains a human confirmation gate.

## URLs

- Public website: `https://mangalamsanitary.in`
- Public intake: `https://mangalamsanitary.in/intake/manglam-trading-demo`
- ERP sign-in: `https://app.mangalamsanitary.in/signin`
- TrustFirst portal: `https://client.trustfirstsolutions.in`
- Unsupported domains removed: `manglam.in`, `app.manglam.in`

## Production Health

- PM2 process: online
- Port 3010: loopback-only behind Nginx
- Nginx: active, configuration syntax valid
- Database: `trustfirst_demo`, connected
- Prisma migrations: 12 applied, latest `20260727070500_hardware_day_closing`, 0 failed
- Persistent storage: release storage symlinked to `/var/www/trustfirst-client-portal/storage`
- Disk space: 49G total, 7.6G available after handover release
- TLS: valid Let's Encrypt certificates for `mangalamsanitary.in`, `app.mangalamsanitary.in`, and `client.trustfirstsolutions.in`
- Runtime health: passed
- TrustFirst smoke: passed
- Mangalam ERP smoke: passed
- Public intake smoke: passed, latest smoke submission `PUB-REQ-2026-0019`

## Backup

- Existing backup verified: `/var/backups/trustfirst-client-portal/20260727T083505Z`
- Database dump: `trustfirst_demo.dump`, non-empty
- Database dump SHA-256: `a7c28f613a9962886a38a5b44ae00e0eb2a6755c183fb27c6e731d91a51df80c`
- Tenant assets backup: `tenant-assets.tgz`, checksum OK
- Tenant profile backup: `tenant-profile.json`, checksum OK
- Environment backup: present through server-side backup process without printing secrets
- Nginx/source evidence: present in backup register

## Owner/Admin Verification

- Tenant slug: `manglam-trading-demo`
- Tenant name: `MANGALAM SANITARY`
- Tenant status: `ACTIVE`
- Official identity: locked
- Proprietor: `KRISHAN KUMAR`
- GSTIN: `08EFPK7672A1ZT`
- Owner/admin account: active and email verified
- Role: `manglam-demo-admin`
- Permissions: 15 required permissions present, including hardware catalog, inventory, sales, purchase, settings, billing and payment permissions
- Cross-tenant access: no other tenant memberships found for the Mangalam admin account
- Password: present but not printed

## Authentication And Host Isolation

- Mangalam ERP `/signin`: HTTP 200
- Mangalam callback cookie: `https://app.mangalamsanitary.in`
- Public Mangalam callback cookie: `https://mangalamsanitary.in`
- TrustFirst callback cookie: `https://client.trustfirstsolutions.in`
- `AUTH_URL` and `NEXTAUTH_URL`: absent from VPS env so Auth.js derives the current secure host
- Temporary HTTP staging auth gates: absent
- Credential-backed session test: passed without printing the password
- Authenticated `/admin`: HTTP 200 with Mangalam admin session
- Anonymous protected admin routes: redirect/lockdown preserved
- No redirect to TrustFirst observed on Mangalam ERP sign-in/session checks

## Public Intake Fix

- Root cause found: host boundary treated all `/intake` routes as TrustFirst-only on the public Mangalam host.
- Fix deployed: allow only `/intake/manglam-trading-demo` and its child pages on `MANGALAM_PUBLIC`; keep other `/intake/*` routes redirected.
- Focused tests: added for approved public intake allow and other intake redirect.
- Live public intake: HTTP 200
- Public intake smoke: passed and verified private admin queue record `PUB-REQ-2026-0019`

## Product Import Acceptance

- Template endpoint: HTTP 200 CSV
- Import page: protected and redirects unauthenticated users to Mangalam `/signin`
- TEST import marker: `20260727091901`
- Preview: passed, 3 valid rows
- Dry run: passed, wrote 0 products
- Execute: passed, created 3 TEST products
- Opening stock: 3 stock movements created
- Duplicate SKU repeat: blocked with duplicate SKU errors and did not duplicate products/stock
- Invalid row: formula text and invalid HSN were rejected in preview
- Acceptance TEST products retained with audit/stock history; no manual deletion performed

## Billing, Purchase, Ledger And Day Closing Acceptance

- Acceptance marker: `20260727092314`
- TEST customer created: yes
- TEST supplier created: yes
- Cash sale: posted once, invoice `MS/INV/2026-27/00001`, payment status `paid`, print projection includes GSTIN
- Credit sale: posted, partial payment recorded, final payment recorded, outstanding settled
- Cancellation: separate TEST sale cancelled, status `CANCELLED`, stock restoration workflow passed
- Sale return: partial return created, customer credit/refund path verified
- Refund guard: refund recorded, duplicate/over-refund blocked with HTTP 422
- Purchase: TEST purchase created and confirmed, stock increased
- Supplier payment: remaining supplier payable paid
- Purchase return: partial return created, stock reduction workflow passed
- Day closing: close created, duplicate close blocked with HTTP 422, reopen with reason passed
- GST snapshots: invoice line HSN present, trade line HSN present, tax rate snapshot `1800`, invoice prefix `MS/INV` verified

## PWA Acceptance

- Manifest name: `MANGALAM SANITARY ERP`
- Short name: `Mangalam ERP`
- App ID: `https://app.mangalamsanitary.in/mangalam-erp`
- Start URL: `https://app.mangalamsanitary.in/admin`
- Scope: `https://app.mangalamsanitary.in/`
- Icons: `/api/public/branding/mangalam-sanitary-logo`
- Branding: Mangalam black/gold ERP identity, no TrustFirst branding in manifest
- Physical app installation: requires user action in browser and was not claimed as physically verified

## Print Acceptance

- Windows printers detected: `Microsoft Print to PDF`
- Thermal printer detected: no
- Browser print projection: passed through production print API for TEST invoice
- Print classification: Software/PDF printing verified at application projection level only; physical paper output pending user/printer action
- Non-financial test print helper exists in POS UI and is designed to create no sale, invoice, payment, stock movement, or ledger entry

## Client Product Data Preparation

Required import columns:

- Product name
- SKU
- Barcode
- Category
- Brand
- Unit
- HSN
- GST rate
- Purchase rate
- Sale rate
- MRP
- Opening stock
- Minimum stock
- Stock location
- Active status

Client rules:

- One product per row
- Unique SKU
- Unique barcode
- Numeric prices only
- No currency symbols in numeric cells
- GST rate as a number or basis points as documented
- Opening stock as a number
- Do not merge cells
- Do not add formulas
- Save as CSV UTF-8
- Do not import the real client sheet until supplied and reviewed

## Security And Audit

- Host-key verification: passed
- Latest known_hosts backup: `C:\Users\DELL\.ssh\known_hosts.trustfirst-backup-20260727092728`
- Host-header/open redirect tests: passed
- CSRF protection: verified, write requests without matching Origin were blocked with HTTP 403
- Product import formula validation: passed
- Duplicate/idempotency controls: passed for import and posting flows
- `npm audit --omit=dev`: 3 high advisories remain via Next transitive `postcss` and `sharp`; npm only suggests `npm audit fix --force`, which would be breaking, so no forced dependency change was applied.

## Validation Commands

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test`: passed, 36 files and 137 tests
- `npm run build`: passed
- `npm run db:generate`: passed
- `git diff --check`: passed
- `npm run runtime:health`: passed
- `npm run vps:smoke`: passed
- `SMOKE_BASE_URL=https://app.mangalamsanitary.in npm run deploy:smoke`: passed
- `SMOKE_BASE_URL=https://mangalamsanitary.in npm run intake:smoke`: passed

## CafeLuxe Isolation

- CafeLuxe files touched: no
- CafeLuxe database touched: no
- CafeLuxe PM2 process touched: no
- CafeLuxe Nginx/Caddy config touched: no
- CafeLuxe port 3000 touched: no

## Remaining Human/External Gates

- Physical thermal printer selection and paper output confirmation
- Client real product spreadsheet
- Secure handoff/reset of the owner/admin production password
- GST provider/GSP credentials if live GST filing/e-invoice integration is required later
- E-invoice applicability confirmation based on turnover and current statutory rules
