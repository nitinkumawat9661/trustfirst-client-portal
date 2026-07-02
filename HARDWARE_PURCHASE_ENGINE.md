# Hardware Purchase Engine

The Hardware Purchase Engine manages purchase orders, purchase entries, supplier bill entries, purchase returns, supplier outstanding contracts, and stock addition on confirmed purchases.

## Flow

Purchase orders do not move stock. Purchase entries and supplier bills add stock on confirmation. Purchase returns deduct stock from the selected location.

## Supplier Link

Suppliers are represented through CRM client organization links so tenant contact, notes, and lifecycle data remain reusable.

## Accounting Boundary

Supplier outstanding is exposed as a contract from supplier-bill totals and payment status. This is not a full accounting ledger.
