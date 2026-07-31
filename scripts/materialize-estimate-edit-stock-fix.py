from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if new and new in text:
        return
    if text.count(old) != 1:
        raise RuntimeError(f"Expected one match in {relative}, found {text.count(old)}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''    for (const item of normalizedItems) {
      if (isStockSetupPending(products.get(item.productId)?.metadata)) continue;
      requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) ?? 0) + item.quantity);
    }''',
    '''    for (const item of normalizedItems) {
      requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) ?? 0) + item.quantity);
    }''',
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    '''      for (const item of normalizedItems.filter((candidate) => !isStockSetupPending(products.get(candidate.productId)?.metadata))) {''',
    '''      for (const item of normalizedItems) {''',
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    '''function canSave(lines: EstimateLine[]) {
  return lines.length > 0 && lines.every(
    (line) => line.productId && Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0 && Number(line.unitRate) >= 0,
  );
}

''',
    "",
)
print("ESTIMATE_EDIT_STOCK_FIX_MATERIALIZED")
