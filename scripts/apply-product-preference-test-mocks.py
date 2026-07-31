from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected test block not found in {path}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "apps/web/src/server/hardware/trade-service.test.ts",
    "  return {\n    tenantMembership: {",
    "  return {\n    hardwareProduct: {\n      findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),\n      update: async ({ data }: { data: unknown }) => data,\n    },\n    tenantMembership: {",
)

replace_once(
    "apps/web/src/server/hardware/estimate-sale-lifecycle.test.ts",
    "          hardwareInventoryMovement: {\n            create: async ({ data }: { data: Record<string, unknown> }) => {\n              movements.push(data);\n              return data;\n            },\n          },\n          hardwareTradeDocument: {",
    "          hardwareInventoryMovement: {\n            create: async ({ data }: { data: Record<string, unknown> }) => {\n              movements.push(data);\n              return data;\n            },\n          },\n          hardwareProduct: {\n            findFirst: async () => ({ gstTaxConfig: {}, metadata: {} }),\n            update: async ({ data }: { data: unknown }) => data,\n          },\n          hardwareTradeDocument: {",
)

print("Product preference test mocks materialized.")
