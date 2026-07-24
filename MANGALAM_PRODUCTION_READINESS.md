# Mangalam Production Readiness

## Current Decision

Status: `PENDING FINAL DEPLOYMENT AND LIVE QA`

The domain, identity lock, backup, source-document controls, and obsolete-data cleanup are complete. The final production UI passes focused lint, strict TypeScript, and automated tests locally. A final decision requires deployment of the current UI commit followed by HTTPS, authenticated-route, runtime, print, and responsive QA.

## Completed Gates

| Gate | Status |
| --- | --- |
| DNS for canonical and `www` | Verified |
| Separate TrustFirst Nginx site | Verified |
| TLS certificate for both names | Issued |
| Canonical HTTPS auth URL | Configured |
| Temporary HTTP auth gates | Removed |
| Public port `3010` exposure | Removed |
| TrustFirst-only backup | Verified |
| Cleanup dry run | Verified |
| Obsolete demo and smoke cleanup | Applied |
| `PUB-REQ-2026-0015` | Preserved |
| Official GST identity | Preserved and locked |
| Approved logo | Preserved and locked |
| Private source documents | Preserved and protected |
| Final production routes/UI | Implemented locally |
| Demo seed repopulation guard | Enabled |

## Live Data State

- Products: `0`
- Inventory movements: `0`
- Explicit customers/suppliers: `0`
- Trade documents: `0`
- Invoices: `0`
- Payments: `0`
- Authoritative public submission: retained
- Review-required intake records: retained

Empty operational screens are the correct production behavior until verified client master data is approved.

## Dependency Security

- Next.js: `16.2.11`, current stable at validation time
- Auth.js: `5.0.0-beta.32`
- `@auth/core`: `0.41.3`
- Critical Auth.js and earlier Next advisories: resolved by upgrade
- Remaining npm audit result: three high findings inherited from Next's pinned PostCSS `8.4.31` and optional Sharp `0.34.5`
- Runtime mitigation: Next image optimization is disabled globally, so Sharp is not used for application image processing
- PostCSS exposure: build-time only; the application does not accept or compile user-supplied CSS

No unsupported transitive override is used. Upgrade again when a stable Next release carries patched transitive versions.

## Remaining Client Inputs

- Verified product master
- Verified HSN and product-specific GST rates
- Current purchase and sale prices
- Opening stock by location
- Actual customer and supplier masters
- Opening balances and reconciliation date
- Financial year, document prefixes, round-off policy, and terms/footer
- Owner/Manager identities and final permission matrix

## Final Gate

After deployment, this report must be updated with:

- deployed commit
- secure authenticated sign-in result
- canonical/redirect and certificate-renewal checks
- runtime health and smoke results
- responsive browser QA
- CafeLuxe isolation verification
- final `READY` or `NOT READY` decision
