# Hardware Sales Engine

The Hardware Sales Engine manages sales quotations, sales orders, sale invoice drafts, stock deduction on confirmed sales, sale returns, customer outstanding links, and A4/WhatsApp contracts.

## Flow

Sales documents start as drafts. Confirmed sales orders deduct stock from the selected stock location. Sale returns add stock back. Sales quotations do not move stock.

## Billing Link

Sale invoice drafts are created through the Billing Engine as draft invoice records linked back to the hardware trade document. Live payment gateways remain out of scope.

## Contracts

- A4 PDF render contract: `hardware-trade-a4-v1`
- WhatsApp share contract only, no live integration
