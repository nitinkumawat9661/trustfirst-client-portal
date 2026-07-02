# Billing Engine

The Billing Engine provides invoice and manual payment foundations for TrustFirst Client Portal. It is not an ERP, inventory system, payment gateway integration, or full accounting ledger.

## Scope

- Billing profiles per tenant/client
- Invoice numbering and lifecycle
- Payment terms and due-date tracking
- Partial payment support
- Manual payment entry
- Receipt document linking
- Outstanding amount calculation
- CSV export contract
- PDF render contract
- Billing dashboard metrics

## Security

Billing operations are tenant-scoped and require server-side permissions:

- `billing.read`
- `billing.manage`
- `billing.payments.manage`

The wildcard permission remains available for system administrators.

## Provider Contracts

Razorpay, Stripe, PhonePe, UPI QR, and Manual providers are modeled as contracts only. No live APIs, webhooks, captures, refunds, or settlement flows are connected in this sprint.
