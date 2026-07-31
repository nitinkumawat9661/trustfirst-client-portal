# TrustFirst / Mangalam Developer Architecture Guide

This document is the engineering map for the TrustFirst Client Portal and the Mangalam Sanitary ERP. It explains where code belongs, which files own each responsibility, how to make changes without damaging unrelated workflows, and which checks must pass before a VPS production release.

The primary objective is **change isolation**: a change to one field or feature must affect the smallest possible module and must not silently change billing, inventory, printing, authentication, financial transactions, tenant isolation, or deployment behavior.

---

## 1. Non-negotiable production invariants

Every code change must preserve these rules unless the change explicitly targets one of them and includes dedicated migration, regression, and rollback work.

1. Mangalam ERP production runs on the VPS through PM2 on port `3010`.
2. Canary verification runs on port `3012` before production switching.
3. CafeLuxe runs separately on port `3000` and must never be stopped, restarted, modified, or included in Mangalam scripts.
4. The technical tenant slug remains `manglam-trading-demo`.
5. Production business data must not be seeded, reset, or rewritten during ordinary deployments.
6. Unknown production hosts fail closed.
7. A billing operation that changes invoice, stock, payment, financial allocation, or remembered product preferences must remain atomic.
8. Printing must render only the `.print-sheet` bill root. Application header, sidebar, floating widgets, internal IDs, search controls, profile controls, notifications, and toasts must never enter the print document.
9. Production releases are accepted only after exact-SHA verification on the VPS.
10. Vercel is not the Mangalam production runtime and must not be used as production deployment evidence.

---

## 2. Dependency direction

Code should depend inward toward stable contracts and pure domain logic.

```text
Route / Page
    ↓
React UI component
    ↓
Feature adapter or API client
    ↓
Server service / use case
    ↓
Domain calculation and validation
    ↓
Prisma repository / transaction
    ↓
PostgreSQL
```

Cross-cutting browser capabilities such as printing follow a separate boundary:

```text
PrintButton (UI)
    ↓
Browser print adapter
    ↓
Pure print-document builder
    ↓
Print contract constants and types
```

### Forbidden dependency directions

- React components must not import Prisma or `@trustfirst/database` directly.
- Server modules must not import React components.
- Pure feature `core` modules must not access `window`, `document`, React, Next.js, Lucide, Prisma, or server services.
- Browser adapters must not read or write the database.
- Shared packages must not depend on the web application.
- E2E test code must never be imported by production application code.

The command below enforces the most important boundaries:

```bash
npm run architecture:check
```

The same check runs in GitHub CI.

---

## 3. Repository map

```text
apps/
  web/
    src/
      app/                  Next.js routes, layouts and route handlers
      components/           Reusable React UI and feature forms
      features/             Explicit feature boundaries and adapters
      lib/                  Generic client/server utilities
      server/               Server-side use cases, services and policies
packages/
  config/                   Shared runtime configuration helpers
  database/                 Prisma schema, generated client entry point
  ui/                       Shared design-system primitives
scripts/                    Validation, staging, backup and VPS deployment scripts
e2e/                        Real Chromium end-to-end journeys
docs/                       Architecture, operations and handover documents
.github/workflows/           CI, staging E2E and VPS release gates
```

---

## 4. Important Mangalam billing files

### UI and keyboard entry

- `apps/web/src/components/hardware/quick-pos-form.tsx`
  - Fast Bill user interface.
  - Owns local form state and UI orchestration.
  - Must not contain database logic.

- `apps/web/src/components/hardware/estimate-bill-form.tsx`
  - Estimate Bill create/edit user interface.
  - Owns local form state and redirects to the print route.
  - Must not duplicate server-side stock or financial rules.

- `apps/web/src/components/hardware/hardware-product-combobox.tsx`
  - Product search and keyboard selection.
  - Plain Enter selects the best-ranked visible result.
  - Search behavior changes must be tested in both Fast Bill and Estimate Bill.

- `apps/web/src/components/hardware/billing-keyboard.ts`
  - Pure keyboard navigation decisions.
  - Use this instead of repeating row-navigation logic inside forms.

- `apps/web/src/components/hardware/billing-lines.ts`
  - Shared line completion and posting rules.
  - Untouched trailing rows are allowed; partially edited invalid rows are not.

- `apps/web/src/components/hardware/hardware-api-client.ts`
  - Browser-to-server JSON request adapter.
  - Keep network error normalization here rather than duplicating it in forms.

### Server use cases

- `apps/web/src/server/hardware/trade-service.ts`
  - Sales, estimates, invoice creation, stock movements and related transaction orchestration.
  - Changes here are high risk and require service tests plus disposable PostgreSQL E2E.

- `apps/web/src/server/hardware/hardware-service.ts`
  - Hardware catalogue and supporting hardware operations.
  - Product summary fields exposed to UI should be selected and normalized here.

- `apps/web/src/server/hardware/financial-service.ts`
  - Financial transaction behavior and allocations.
  - Never write payment or outstanding logic directly from a React component.

- `apps/web/src/server/hardware/sales-preferences.ts`
  - Product-specific remembered sales preferences such as last discount and GST.
  - Preference writes belong inside the successful sale/estimate transaction.

- `apps/web/src/server/hardware/types.ts`
  - Server and UI-facing hardware contracts.
  - Prefer additive changes. Removing or renaming a field requires all callers and tests to migrate together.

- `apps/web/src/server/hardware/schemas.ts`
  - Input validation contracts.
  - Validation is a boundary, not a replacement for domain invariants inside services.

### Persistence

- `packages/database/prisma/schema.prisma`
  - Database source of truth.
  - Do not modify for a preference that can safely use existing structured metadata.
  - Every schema change requires a checked-in migration and disposable-database verification.

- `packages/database/prisma/migrations/`
  - Immutable migration history.
  - Never edit an already applied production migration.

---

## 5. Printing architecture

Printing is isolated because it previously leaked ERP interface elements into saved PDFs.

### Files

- `apps/web/src/components/hardware/print-button.tsx`
  - Thin React UI.
  - Displays status and calls the browser adapter.
  - Must not build HTML or query unrelated application elements.

- `apps/web/src/features/hardware/printing/browser/open-isolated-bill-print.ts`
  - Owns browser side effects: locating `.print-sheet`, cloning it, removing `.no-print`, opening the popup, waiting for images/fonts and invoking print.
  - Must not know about billing, inventory, Prisma or server services.

- `apps/web/src/features/hardware/printing/core/build-isolated-print-document.ts`
  - Pure HTML builder.
  - Owns the A4 page contract and isolated body document.
  - Must remain deterministic and browser-independent.

- `apps/web/src/features/hardware/printing/core/print-contract.ts`
  - Stable printing constants and types.
  - Change selectors here only after updating print pages and tests together.

- `apps/web/src/components/hardware/print-button.test.ts`
  - Unit-level HTML contract tests.

- `e2e/mangalam-erp.spec.ts`
  - Real Chromium verification that the popup body contains one direct `.print-sheet`, contains the A4 rule, removes `.no-print`, becomes print-ready and invokes the print function.

### Printing invariants

1. The source page must expose one printable `.print-sheet` root.
2. The popup body must contain only the cloned bill root.
3. `.no-print` descendants are removed before document creation.
4. A4 portrait is explicit and has controlled margins.
5. Images and fonts are ready before printing.
6. Popup blocking produces a visible user message instead of silent failure.
7. Printing code never mutates invoice, stock, payment or customer data.

### What automated printing tests can and cannot prove

Automated tests prove the DOM isolation, A4 CSS contract, popup creation path and print invocation in Chromium. They do not prove every physical printer driver, browser PDF renderer version, paper tray, scaling setting or operating-system print dialog. Before a large release that changes invoice layout, perform one manual A4 PDF review from production-like staging.

---

## 6. Safe method for changing one field

Example: adding a new line-level field such as `cessPercent`.

### Step 1: define the business meaning

Write down:

- allowed values,
- whether the field affects taxable value,
- whether it affects invoice total,
- whether it affects stock,
- whether it is stored on draft, confirmed document or both,
- whether old records require a default.

Do not begin with the UI.

### Step 2: update contracts additively

- Add the field to the relevant type and Zod schema.
- Prefer optional/defaulted fields during rollout.
- Keep existing clients valid.

### Step 3: implement pure calculation

- Put arithmetic in a pure function.
- Add table-driven tests for `0`, normal, maximum and rounding boundaries.
- Do not calculate totals independently in multiple forms and services.

### Step 4: update the transaction boundary

- Persist the field inside the existing atomic use case.
- Confirm rollback behavior if invoice, stock, payment or preference write fails.
- Avoid extra queries inside loops; fetch required records in one query where possible.

### Step 5: expose through route/API

- Route handlers validate, authorize and call the service.
- Route handlers should not contain business calculations.

### Step 6: update UI last

- Add the field to local form state.
- Reuse shared calculation and keyboard helpers.
- Keep focus order explicit and test it.

### Step 7: add regression coverage

At minimum:

- pure calculation test,
- service/transaction test,
- route or schema test when applicable,
- Chromium E2E for a user-visible critical workflow,
- PostgreSQL assertion for persisted financial/stock effects.

### Step 8: release through canary

- Merge only when all required checks are green on the exact PR head.
- Deploy through the guarded VPS workflow.
- Verify exact deployed SHA, ERP domain, public domain and CafeLuxe isolation.

---

## 7. Transaction safety rules

Billing workflows commonly touch several records. These writes must succeed or fail together.

Typical sale transaction:

```text
trade document
+ trade line items
+ invoice
+ inventory movement
+ payment record
+ financial transaction
+ financial allocation
+ audit/timeline events
+ remembered product preferences
```

Rules:

- Use one Prisma transaction for the complete business operation.
- Never save remembered discount/GST before the invoice/estimate operation succeeds.
- Never decrement stock in client code.
- Never rely only on a UI-disabled button for validation.
- Preserve idempotency keys on retryable posting endpoints.
- Validate tenant ownership in every lookup and write.
- Avoid partial exception handling inside a transaction that converts a real failure into an apparent success.

---

## 8. Performance rules

1. Select only required database fields.
2. Avoid N+1 queries; batch product, stock and preference reads.
3. Keep money in integer cents and tax/discount percentages in basis points on the server.
4. Do not perform repeated `JSON.parse`/`JSON.stringify` work during React renders.
5. Memoize derived totals, not mutable business state.
6. Do not place a complete product catalogue in component state when server search can return a ranked subset.
7. Keep browser adapters lazy; do not open windows or query DOM at module import time.
8. Do not add a dependency when a small local pure function is sufficient.
9. Measure before introducing caching. Incorrect tenant-aware caching is worse than a slightly slower query.
10. Treat large formatting-only diffs as risk: they obscure behavioral review and complicate rollback.

---

## 9. Test and release matrix

| Change type | Required checks |
|---|---|
| Pure calculation/helper | Unit tests, lint, typecheck |
| UI field or keyboard flow | Unit/helper tests and Chromium E2E |
| Server service | Service tests and disposable PostgreSQL verification |
| Billing/stock/payment | Full tests, production build, Chromium E2E, database assertions |
| Printing layout/flow | Print contract tests, Chromium popup isolation, manual A4 review for material layout changes |
| Prisma schema | Migration deploy on disposable PostgreSQL, service tests, E2E, production migration review |
| Authentication/security | Security regression gate, host/CSRF/session tests, production build |
| Deployment script | Shell syntax, read-only VPS preflight, canary, rollback and exact-SHA verification |

Standard commands:

```bash
npm ci
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
npm run db:generate
npm run architecture:check
npm run lint
npm run typecheck
npm test
npm run build --workspace @trustfirst/web
```

---

## 10. CI and deployment files

- `.github/workflows/security-regression.yml`
  - Dependency audits, Prisma generation, architecture boundaries, lint, typecheck, tests and production build.

- `.github/workflows/mangalam-staging-e2e.yml`
  - Disposable PostgreSQL, migrations, demo seed, architecture checks, full tests, build, isolated Chromium and database verification.

- `scripts/deploy-production-ci.sh`
  - Guarded VPS deployment, canary health, rollback copy, PM2 switch and CafeLuxe isolation.

- VPS production marker
  - The workflow verifies the exact commit stored by the deployed runtime. Do not accept a successful build alone as proof that production changed.

### VPS-only release rule

Do not run `vercel deploy`, `vercel --prod`, a Vercel promote action or any equivalent release command for Mangalam production. A Vercel Git status may exist because of repository integration, but it is not the Mangalam production release and must not replace VPS verification.

---

## 11. Review checklist

Before approving a change, answer all items.

### Scope

- Is the change limited to the intended bounded context?
- Is there a smaller pure helper or adapter that prevents duplication?
- Does the diff contain unrelated formatting noise?

### Data

- Is every query tenant-scoped?
- Are financial values represented safely?
- Is the transaction atomic?
- Is a migration actually required?
- Are old records compatible?

### UI

- Does keyboard flow still work without a mouse?
- Are loading, failure and retry states visible?
- Are blank and partially filled rows handled differently?

### Printing

- Is only `.print-sheet` cloned?
- Are `.no-print` elements removed?
- Does Chromium popup isolation pass?
- Was a manual A4 PDF reviewed when layout materially changed?

### Security

- Are authorization and validation enforced server-side?
- Is sensitive information absent from logs and error messages?
- Are unknown hosts and cross-site mutations still rejected?

### Release

- Did all checks pass on the exact head SHA?
- Did VPS canary pass?
- Does deployed SHA equal merged SHA?
- Were migrations/seeds/data mutation explicitly reported?
- Was CafeLuxe untouched?

---

## 12. Common anti-patterns

Do not:

- place Prisma queries inside React components,
- copy tax/discount calculations into several forms,
- update stock from the browser,
- catch a transaction error and return success,
- use metadata as an unvalidated dumping ground,
- mutate production data in a deployment test,
- edit an applied migration,
- add a global CSS print rule that unintentionally affects the ERP shell,
- use `window.print()` on the complete application page,
- merge a very large reformat together with behavioral changes,
- deploy directly to production without canary and exact-SHA checks.

---

## 13. Recommended future modularization

The repository is operational and should be modularized incrementally, not through a single destructive rewrite.

Recommended order:

1. Continue extracting pure billing calculations into feature `core` modules.
2. Introduce explicit server use-case interfaces around trade and financial services.
3. Move route-specific request parsing into adapters while keeping services transport-independent.
4. Add contract tests for public service inputs/outputs.
5. Split large React forms into state/controller hooks and presentation sections only when tests already cover their behavior.
6. Add query-count and slow-query observability before introducing caches.

Each extraction should be a behavior-preserving PR with green CI before the next extraction begins.

---

## 14. Definition of done

A change is complete only when:

- code is located in the correct boundary,
- duplicate business logic is not introduced,
- architecture checks pass,
- relevant unit/service/E2E/database tests pass,
- production build passes,
- documentation is updated when a contract or module boundary changes,
- the guarded VPS deployment succeeds,
- exact deployed SHA is verified,
- no unintended migration, seed or CafeLuxe change occurred.
