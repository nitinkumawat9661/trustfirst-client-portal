# AGENTS.md

## Purpose
Permanent rules for the TrustFirst Client Portal and tenant-specific products.

Every sprint must read this file first.

Future sprint prompts should contain only:
- context delta
- changes
- acceptance criteria
- validation
- commit/report requirements

Do not repeat these permanent rules unless intentionally changing them.

## Architecture
Commercial multi-tenant SaaS owned by TrustFirst Solutions.

Stack:
- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- Auth.js
- Monorepo: apps/web, packages/ui, packages/database, packages/config

Rules:
- services enforce permissions/business lifecycle
- repositories/data layer handle Prisma persistence
- routes/controllers remain thin
- core business logic must not live in UI
- all tenant data/queries must be tenant scoped
- Mangalam must remain one tenant, not a global hardcoded default

## Canonical Domains

### Mangalam Public
https://mangalamsanitary.in
- public business website
- invoice/payment receipt lookup
- customer-facing content only

### Mangalam ERP
https://app.mangalamsanitary.in
- authenticated Owner/Manager ERP

### TrustFirst Client Portal
https://client.trustfirstsolutions.in
- TrustFirst multi-client portal
- intake/onboarding/projects/admin/client workflows

Enforce host boundaries centrally.
Never leak protected/internal surfaces across hosts.

## Mangalam Source of Truth
Locked identity:

Trade Name: MANGALAM SANITARY
Legal Name / Proprietor: KRISHAN KUMAR
GSTIN: 08EFPK7672A1ZT
Tagline: BATHWARE • PLUMBING • HARDWARE

Use the approved black/gold logo.

Technical tenant slug:
manglam-trading-demo

Do not rename the slug without a dedicated migration, relation audit, backup and rollback plan.

Source priority:
1. official GST/legal documents
2. approved branding/configuration
3. confirmed client submissions
4. verified business source documents
5. demo/reference data

Supplier invoices or old naming must not overwrite authoritative identity.

## Production Data
Never invent or silently infer:
- products/stock
- opening/current balances
- GST/HSN
- prices
- customers/suppliers
- payments/transactions

Missing GST/HSN may remain PENDING / NOT_PROVIDED / VERIFIED.

Historical/reference invoices must not automatically become:
- current stock
- current prices
- current balances

Production UI shows real data or correct empty states, never fake business data.

## Destructive Changes
Before production deletion/mutation:
1. backup
2. verify backup
3. dry-run/classify
4. preserve real/system records
5. delete only positively identified obsolete data
6. document results
7. preserve rollback path

Classification:
KEEP_REAL
KEEP_SYSTEM
DELETE_DEMO
DELETE_SMOKE
DELETE_SUPERSEDED
REVIEW_REQUIRED

Never automatically delete REVIEW_REQUIRED.

Always preserve:
PUB-REQ-2026-0015

Never run destructive production DB reset commands or broad unreviewed destructive SQL.

## Infrastructure Boundaries
TrustFirst VPS: 45.10.21.141
App: /var/www/trustfirst-client-portal
PM2: trustfirst-client-portal
Internal port: 3010
DB: trustfirst_demo
Env: /etc/trustfirst-client-portal.env

Keep port 3010 loopback/internal where practical.

CafeLuxe is unrelated production infrastructure.

Never modify/restart/delete/migrate:
- CafeLuxe files
- CafeLuxe database
- CafeLuxe PM2
- CafeLuxe Nginx
- CafeLuxe secrets
- port 3000

## Secrets
Never print, commit, log or document raw:
- passwords
- DB credentials/URLs containing credentials
- AUTH_SECRET
- API tokens
- private keys
- session secrets
- production env contents

Reports/validation must redact secrets.

## Authentication
Protected ERP/admin/client routes require proper authentication and authorization.

Temporary HTTP staging bypasses must not become permanent production auth.

After HTTPS:
- secure cookies
- CSRF/session protection
- remove temporary HTTP staging bypass behavior from production paths

## Public Receipt Lookup
Approved lookup input:
receipt/invoice number only.

Formats:
- MS/INV/<FY>/<SEQUENCE>
- MS/REC/<FY>/<SEQUENCE>

Example:
MS/INV/2026-27/00001

Required:
- exact match only
- server-side lookup
- rate limiting
- generic not-found response
- enumeration resistance
- no wildcard/partial/autocomplete
- no public listing
- no sequential previous/next browsing

May expose:
- View Bill
- PDF
- Print
- safe WhatsApp/share URL
- Paid / Partially Paid / Outstanding

Never expose:
- purchase cost/margin
- internal supplier pricing
- private notes
- tenant/database IDs
- audit/internal metadata

## Numbering
Invoice:
MS/INV/<FY>/<SEQUENCE>

Payment Receipt:
MS/REC/<FY>/<SEQUENCE>

Must be:
- tenant scoped
- unique
- concurrency safe
- financial-year aware
- configurable where appropriate

Never silently renumber real existing documents.

## UI/UX
Mangalam production UI must be:
- real production UI, not disposable preview
- professional retail/ERP oriented
- counter/keyboard friendly
- responsive
- readable
- restrained charcoal/black + warm gold branding

Use consistent loading, empty, success, error and disabled states.

Never present mock data as real.

## Database/Migrations
For schema changes:
- align Prisma schema/migration
- review tenant impact
- consider backward compatibility
- define rollback for risky changes

Never modify an already-applied migration just to hide drift.
Never reset production DB destructively.

## Deployment
Before changes:
- inspect git/runtime state
- preserve unrelated changes
- backup when data/config risk exists

Deployment:
- build intended commit
- restart only intended TrustFirst process
- verify runtime health
- verify host routing
- run `nginx -t` before Nginx reload
- verify DNS before HTTPS
- never fake readiness

## Validation
Run applicable:
- lint
- typecheck
- build
- tests
- Prisma generate/validate
- runtime health
- domain/route smoke tests
- auth/security boundary tests
- git diff --check

Skipped/failed checks must be reported honestly.

## Git
- inspect `git status` before edits
- never overwrite unrelated changes
- stage/commit only sprint-related files
- never commit secrets/env/private backups
- no force-push/history rewrite without explicit instruction

## Documentation
Update only sprint-relevant docs.
Do not repeat permanent rules from this file in every sprint document.

## Sprint Format
SPRINT <N> – <TITLE>

Read AGENTS.md first.

### Context Delta
Only new facts/decisions.

### Changes
Only requested work.

### Acceptance Criteria
Measurable completion conditions.

### Validation
Required checks.

### Commit / Final Report
Scoped commits, results and blockers.

## Stop Conditions
Stop and report instead of guessing when:
- authoritative data is missing
- DNS/HTTPS prerequisite is unavailable
- destructive data cannot be safely classified
- tenant isolation is uncertain
- migration risks real records
- work could affect CafeLuxe
- required secret/access is unavailable
- validation fails without a safe known resolution

Never fabricate success.