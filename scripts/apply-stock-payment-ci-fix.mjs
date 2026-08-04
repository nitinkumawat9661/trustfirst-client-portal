import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
}

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${path}: no change`);
  writeFileSync(path, after);
}

for (const path of [
  "apps/web/src/components/hardware/estimate-bill-form.tsx",
  "apps/web/src/components/hardware/quick-pos-form.tsx",
]) {
  update(path, (source) => replaceOnce(
    source,
    'from "@/lib/hardware/payment-choice";',
    'from "../../lib/hardware/payment-choice";',
    `${path} relative payment helper`,
  ));
}

update("apps/web/src/server/hardware/trade-service.test.ts", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    '  it("does not create stock movement for stock-setup-pending products", async () => {',
    '  it("deducts stock for products previously marked stock-setup-pending", async () => {',
    "pending stock test title",
  );
  const blockStart = '  it("deducts stock for products previously marked stock-setup-pending", async () => {';
  const blockEnd = '\n  it("posts supplier payable and only the entered partial payment when purchase is confirmed", async () => {';
  const start = source.indexOf(blockStart);
  const end = source.indexOf(blockEnd, start);
  if (start < 0 || end < 0) throw new Error("pending-stock test block not found");
  let block = source.slice(start, end);
  block = replaceOnce(
    block,
    '        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },\n',
    '        hardwareInventoryMovement: {\n          findMany: async () => [{ quantity: 5, type: HardwareInventoryMovementType.STOCK_IN }],\n        },\n        hardwareStockLocation: { findFirst: async () => ({ id: "loc_1" }) },\n',
    "pending stock availability mock",
  );
  block = replaceOnce(
    block,
    '    expect(movements).toHaveLength(0);',
    '    expect(movements).toHaveLength(1);\n    expect(movements[0]?.data.type).toBe(HardwareInventoryMovementType.STOCK_OUT);',
    "pending stock movement expectation",
  );
  return source.slice(0, start) + block + source.slice(end);
});

update("apps/web/src/server/hardware/trade-service.ts", (source) => replaceOnce(
  source,
  '    for (const item of returnItems) {\n      const original = originalItems.get(readString(asRecord(item.metadata).originalItemId) ?? "");\n      const movements = await this.prisma.hardwareInventoryMovement.findMany({',
  '    for (const item of returnItems) {\n      const movements = await this.prisma.hardwareInventoryMovement.findMany({',
  "remove obsolete purchase-return original lookup",
));

console.log("STOCK_PAYMENT_CI_FIX_APPLIED");
