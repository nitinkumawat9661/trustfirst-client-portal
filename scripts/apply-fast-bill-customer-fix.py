#!/usr/bin/env python3
from pathlib import Path

path = Path("apps/web/src/components/hardware/quick-pos-form.tsx")
source = path.read_text(encoding="utf-8")

replacements = [
    (
        '                onCreate={(name) => setCustomerName(name)}',
        '''                onCreate={(name) => {
                  setCustomerId("");
                  setCustomerName(name);
                  setQuickCustomer(name);
                }}''',
    ),
    (
        '''          onCreated={(party) => {
            setAvailableCustomers((current) => [party, ...current]);
            setCustomerId(party.id);
            setQuickCustomer(null);
          }}''',
        '''          onCreated={(party) => {
            setAvailableCustomers((current) => [party, ...current.filter((customer) => customer.id !== party.id)]);
            setCustomerId(party.id);
            setCustomerName(party.name);
            setQuickCustomer(null);
          }}''',
    ),
    (
        '<h2 className="text-lg font-semibold">Create customer</h2>',
        '<h2 className="text-lg font-semibold">Create {role === "supplier" ? "supplier" : "customer"}</h2>',
    ),
]

changed = False
for old, new in replacements:
    if new in source:
        continue
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one customer-flow source match, found {count}: {old[:90]!r}")
    source = source.replace(old, new, 1)
    changed = True

path.write_text(source, encoding="utf-8")
print("FAST_BILL_CUSTOMER_FIX_APPLIED" if changed else "FAST_BILL_CUSTOMER_FIX_ALREADY_APPLIED")
