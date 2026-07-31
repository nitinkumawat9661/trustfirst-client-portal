from pathlib import Path

path = Path("apps/web/src/server/hardware/trade-service.test.ts")
text = path.read_text(encoding="utf-8")

old_one = '''            hardwareInventoryMovement: {
              create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }>;
            };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };'''
new_one = '''            hardwareInventoryMovement: {
              create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }>;
            };
            hardwareProduct: {
              findFirst: () => Promise<{ gstTaxConfig: Record<string, unknown>; metadata: Record<string, unknown> }>;
              update: (input: { data: unknown }) => Promise<unknown>;
            };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };'''

old_two = '''            hardwareInventoryMovement: { create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }> };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };'''
new_two = '''            hardwareInventoryMovement: { create: (input: { data: { type: HardwareInventoryMovementType } }) => Promise<{ type: HardwareInventoryMovementType }> };
            hardwareProduct: {
              findFirst: () => Promise<{ gstTaxConfig: Record<string, unknown>; metadata: Record<string, unknown> }>;
              update: (input: { data: unknown }) => Promise<unknown>;
            };
            hardwareTradeDocument: { update: () => Promise<Record<string, unknown>> };'''

for old, new in ((old_one, new_one), (old_two, new_two)):
    if new in text:
        continue
    if old not in text:
        raise SystemExit(f"Expected mock type block not found: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Product preference mock types materialized.")
