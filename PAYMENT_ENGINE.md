# Payment Engine

The Payment Engine records manual payments against invoices and exposes contracts for future payment providers.

## Manual Payments

Manual payment records support:

- Cash
- UPI
- Bank Transfer
- Cheque
- Card
- Other

Payments can include a reference, receipt document link, received date, notes, and metadata.

## Partial Payments

The service validates that payment amount cannot exceed the outstanding invoice amount. Invoice status becomes `PARTIALLY_PAID` until paid amount reaches total amount.

## Provider Contracts

Provider contracts exist for Razorpay, Stripe, PhonePe, UPI QR, and Manual. Live payment gateway APIs are intentionally excluded.

## Auditability

Payment recording writes billing timeline events and audit events. Receipt links must point to a commercial document of type `RECEIPT`.
