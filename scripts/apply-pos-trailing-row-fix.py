#!/usr/bin/env python3
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if new in source:
        return source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


path = Path("apps/web/src/components/hardware/quick-pos-form.tsx")
source = path.read_text(encoding="utf-8")

source = replace_once(
    source,
    'import { nextBillingLineAction } from "./billing-keyboard";\n',
    'import { nextBillingLineAction } from "./billing-keyboard";\nimport { canPostBillingLines, completedBillingLines } from "./billing-lines";\n',
    "billing-lines import",
)

source = replace_once(
    source,
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const totals = useMemo(() => calculateTotals(lines, paid, invoiceDiscount), [invoiceDiscount, lines, paid]);
  const pendingStockProducts = lines
    .map((line) => availableProducts.find((product) => product.id === line.productId))
    .filter((product): product is HardwareProductSummary => product?.stockSetupStatus === "PENDING");''',
    '''  const productInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const completedLines = useMemo(() => completedBillingLines(lines), [lines]);
  const canPost = canPostBillingLines(lines);
  const totals = useMemo(() => calculateTotals(completedLines, paid, invoiceDiscount), [completedLines, invoiceDiscount, paid]);
  const pendingStockProducts = completedLines
    .map((line) => availableProducts.find((product) => product.id === line.productId))
    .filter((product): product is HardwareProductSummary => product?.stockSetupStatus === "PENDING");''',
    "completed POS lines",
)

source = replace_once(
    source,
    '      items: lines.map((line) => {',
    '      items: completedLines.map((line) => {',
    "POS payload lines",
)

source = replace_once(
    source,
    '    lines,\n    notes,',
    '    lines: completedLines,\n    notes,',
    "POS preview lines",
)

source = source.replace('!canSave(lines)', '!canPost')

source = replace_once(
    source,
    '''function canSave(lines: PosLine[]) {
  return lines.every((line) => line.productId && Number(line.quantity) > 0 && Number(line.rate) > 0);
}

''',
    '',
    "obsolete canSave helper",
)

path.write_text(source, encoding="utf-8")
print("Applied Quick POS trailing blank-row fix.")
