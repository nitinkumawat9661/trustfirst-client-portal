from pathlib import Path

path = Path("apps/web/src/server/hardware/trade-service.test.ts")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "            hardwareInventoryMovement: {\n              create: async (input: { data: { type: HardwareInventoryMovementType } }) => {\n                movements.push(input);\n                return input.data;\n              },\n            },\n            hardwareTradeDocument: {",
        "            hardwareInventoryMovement: {\n              create: async (input: { data: { type: HardwareInventoryMovementType } }) => {\n                movements.push(input);\n                return input.data;\n              },\n            },\n            hardwareProduct: {\n              findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),\n              update: async ({ data }: { data: unknown }) => data,\n            },\n            hardwareTradeDocument: {",
    ),
    (
        "            hardwareInventoryMovement: { create: async (input) => { movements.push(input); return input.data; } },\n            hardwareTradeDocument: { update: async () => ({ ...document, status: HardwareTradeDocumentStatus.CONFIRMED }) },",
        "            hardwareInventoryMovement: { create: async (input) => { movements.push(input); return input.data; } },\n            hardwareProduct: {\n              findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),\n              update: async ({ data }: { data: unknown }) => data,\n            },\n            hardwareTradeDocument: { update: async () => ({ ...document, status: HardwareTradeDocumentStatus.CONFIRMED }) },",
    ),
    (
        "            hardwareInventoryMovement: { create: async () => created.push(\"movement\") },\n            hardwareTradeDocument: {",
        "            hardwareInventoryMovement: { create: async () => created.push(\"movement\") },\n            hardwareProduct: {\n              findFirst: async () => ({ gstTaxConfig: { rateBps: 1800 }, metadata: { hsnCode: \"8481\" } }),\n              update: async ({ data }: { data: unknown }) => { created.push(\"productPreference\"); return data; },\n            },\n            hardwareTradeDocument: {",
    ),
]

for old, new in replacements:
    if new in text:
        continue
    if old not in text:
        raise SystemExit(f"Expected transaction mock block not found: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Transaction product preference mocks materialized.")
