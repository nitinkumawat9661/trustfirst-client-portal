# Next Sprint Plan: Mangalam Sanitary

> Historical plan notice: identity spelling, legal identifiers, GSTIN, address, proprietor, logo, and tagline were resolved in Sprint 43A. Commercial prefixes, pricing mode, terms, and operational data remain pending client confirmation.

> Real-document update: Sprint 43B locked purchase workflow, line discounts, multi-HSN and split-tax capability, supplier ledger behavior, and A4 multi-page print. No products, stock, rates, parties, or balances were imported.

## Decision

The recommended next data sprint, after production-domain hardening, is:

`MANGALAM VERIFIED MASTER DATA PREVIEW`

It prepares a protected, configuration-driven real client profile. It does not implement unresolved tax, settlement, migration, return, permission, or offline behavior.

## Exact Sprint 43 Prompt

```text
SPRINT 43 - MANGLAM REAL CLIENT CONFIGURATION FOUNDATION

Goal:
Create the production-safe configuration foundation for the real Mangalam Sanitary client using only the authoritative submission PUB-REQ-2026-0015 and approved follow-up answers.

Do NOT invent unresolved business rules.
Do NOT import or promote demo, smoke, QA, or seed records as real client data.
Do NOT hardcode Mangalam in reusable components, services, schemas, or domain logic.
Do NOT modify the original public intake submission.
Do NOT touch CafeLuxe.
Do NOT connect live payment gateways.

Implement:

1. Create a distinct real-client configuration profile linked to the existing isolated tenant strategy.
2. Apply the approved firm spelling, protected GSTIN/address/contact values, financial year, GST mode, round-off, default stock location, invoice prefix, quotation prefix, logo reference, terms, and footer through tenant configuration.
3. Configure only the submitted categories:
   Pipes, Fittings, Taps, Valves, Bathroom accessories, Sanitary ware, Fasteners, Electrical hardware.
4. Configure only the submitted units:
   Piece, Box, Set, Pair, Bundle.
5. Configure the submitted manual payment modes:
   Cash, UPI, Bank Transfer, Cheque, Card, Other.
6. Configure Owner and Manager role shells without guessing unresolved permission grants.
7. Configure English/Hindi defaults using the existing localization foundation.
8. Keep barcode optional and disabled from required V1 workflows.
9. Add protected configuration validation and an idempotent preview/apply command.
10. Add safeguards proving no smoke/test record is selected as a real configuration source.
11. Produce a configuration readiness report listing applied, missing, and blocked values.
12. Do not import products, stock, suppliers, customers, balances, or documents until client files pass preview and approval.

Tests:
- authoritative submission/source guard
- real profile isolation
- idempotent configuration preview/apply
- submitted category and unit validation
- role-shell validation
- no smoke/test promotion
- tenant isolation

Docs:
- MANGLAM_REAL_CONFIGURATION.md
- MANGLAM_CONFIGURATION_READINESS.md
- MANGLAM_DATA_IMPORT_BOUNDARY.md

Run:
npm run lint
npm run typecheck
npm run build
npm test
npm run db:generate
npm run runtime:health
npm run vps:smoke

Commit:
feat: establish mangalam real client configuration
```

## Inputs Required Before Sprint 43 Applies Final Values

- Approved firm spelling
- Validated protected business identifiers and contact values
- Financial year
- Default GST mode
- Default stock location name
- Invoice and quotation prefixes
- Round-off setting
- Logo and footer/terms
- Owner and Manager identities

## Deferred To Later Sprints

- Product and opening-stock import
- Supplier/customer/balance migration
- CGST/SGST/IGST and HSN implementation
- Supplier payment settlement
- Discount authorization rules
- Return/cancellation reversal behavior
- Detailed reports and export formats
- Full bilingual coverage
- Offline synchronization hardening

## Start Decision

- V1 capability scope frozen: yes
- Sprint 43 planning ready: yes
- Production behavior development ready: no, blocked by the listed client decisions
- Client data migration ready: no, blocked by source files and reconciliation rules
