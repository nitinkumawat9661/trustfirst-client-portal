# Public Intake Loading Debug

## Summary

Sprint 38 investigated the report that `http://45.10.21.141:3010/intake/manglam-trading-demo` returned HTTP 200 but stayed on a loading spinner in a real browser.

## Evidence Collected

- `curl -i http://45.10.21.141:3010/intake/manglam-trading-demo`: returned `200 OK`.
- `curl -i http://45.10.21.141:3010/intake/manglam-trading-demo?fresh=1`: returned `200 OK`.
- HTML contained the public form markup, but it was inside a hidden streamed segment.
- The visible body initially contained the global `aria-label="Loading"` spinner.
- `curl -i http://45.10.21.141:3010/_next/static/`: returned `308` to `/_next/static`; individual static assets are not middleware-blocked.
- PM2 logs did not show a public intake server crash. Existing log noise was unrelated Auth.js `MissingCSRF` from the earlier HTTP login issue and the known standalone start warning.
- Playwright is not installed in the repo, so automated browser QA is limited to HTML marker and route-lockdown checks via `npm run intake:smoke`.

## Root Cause

The root `apps/web/src/app/loading.tsx` caused the public intake page to stream a visible full-page loading fallback first and place the actual form in a hidden React segment.

The production CSP currently uses nonce-based inline script policy, while Next streaming reveal scripts in the HTML were not carrying that nonce. In a real browser, those inline reveal scripts can be blocked, leaving the visible loading fallback in place even though curl can see the hidden form HTML.

## Fix Applied

- Removed the root global loading fallback so public routes do not render a spinner-only shell before the form.
- Replaced the public intake page dependency on the client-only React Hook Form component with a server-rendered native HTML form.
- Added native form POST support to `/api/public/intake/manglam-trading-demo` while preserving the JSON submit API used by automation.
- Added stable smoke markers:
  - `Manglam Trading Company`
  - `Software Requirement Form`
  - `Business Details`
  - `Product/Catalog Details`
  - `Stock Details`
  - `Supplier/Customer Details`
  - `Billing Details`
  - `Submit`
- Added `npm run intake:smoke` to verify markers and anonymous route lockdown.

## Local QA

Local production build on port `3020`:

- Public intake marker smoke: passed
- Loading marker absent: passed
- Business details marker present: passed
- Submit marker present: passed
- Anonymous protected routes blocked by redirect/401/403/404 contract: passed

## Deployment QA

Sprint 38 deployment completed on the VPS.

- Public intake URL: `http://45.10.21.141:3010/intake/manglam-trading-demo`
- External smoke: passed
- Intake marker smoke: passed
- Loading marker absent: passed
- Native form POST: passed, created `PUB-REQ-2026-0002`
- JSON confirmation submit: passed, created `PUB-REQ-2026-0003`
- Admin queue sees submissions: passed
- Anonymous admin/client/master/API route lockdown: passed
- CafeLuxe untouched: yes
