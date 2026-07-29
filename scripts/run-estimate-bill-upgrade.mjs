import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "scripts", "apply_estimate_bill_upgrade.py");
let source = fs.readFileSync(sourcePath, "utf8");
source = source.replace(
  "ROOT = Path(__file__).resolve().parents[1]",
  `ROOT = Path(${JSON.stringify(repoRoot)})`,
);

function replacePatchBlock(marker, replacement) {
  const start = source.indexOf(marker);
  if (start < 0) return;
  const end = source.indexOf("\n)\n", start);
  if (end < 0) throw new Error(`Could not isolate generated patch block: ${marker}`);
  source = source.slice(0, start) + replacement + source.slice(end + 3);
}

replacePatchBlock(
  `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    "  const haystack`,
  `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    '  const haystack = [label, sku, barcode, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(" ");\\n',\n    '  const haystack = [label, sku, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(" ");\\n',\n)\n`,
);

replacePatchBlock(
  `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    "           setQuery(event.target.value);`,
  `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    '          setQuery(event.target.value);\\n          setOpen(true);\\n          setActiveIndex(0);\\n          onSelect("");\\n',\n    '          setQuery(event.target.value);\\n          setOpen(true);\\n          setActiveIndex(0);\\n          onSelect("");\\n          onQueryChange?.(event.target.value);\\n',\n)\n`,
);

replacePatchBlock(
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''               <col style={{ width: "6%" }} />`,
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''              <col style={{ width: "6%" }} />\n              <col style={{ width: "10%" }} />\n''',\n    '''              {!isEstimate ? <col style={{ width: "6%" }} /> : null}\n              <col style={{ width: isEstimate ? "16%" : "10%" }} />\n''',\n)\n`,
);

replacePatchBlock(
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''                 <th className="px-2 py-2 text-right">GST</th>`,
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''                <th className="px-2 py-2 text-right">GST</th>\n                <th className="px-2 py-2 text-right">Total</th>\n''',\n    '''                {!isEstimate ? <th className="px-2 py-2 text-right">GST</th> : null}\n                <th className="px-2 py-2 text-right">Total</th>\n''',\n)\n`,
);

replacePatchBlock(
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''                   <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>`,
  `replace_once(\n    "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx",\n    '''                  <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>\n                  <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>\n''',\n    '''                  {!isEstimate ? <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td> : null}\n                  <td className="px-2 py-2 text-right font-medium">{money(item.lineTotalCents)}</td>\n''',\n)\n`,
);

const strictHelper = `def replace_once(relative: str, before: str, after: str) -> None:\n    content = read(relative)\n    count = content.count(before)\n    if count != 1:\n        raise RuntimeError(f"{relative}: expected one occurrence, found {count}: {before[:120]!r}")\n    write(relative, content.replace(before, after, 1))\n`;
const idempotentHelper = `def replace_once(relative: str, before: str, after: str) -> None:\n    content = read(relative)\n    count = content.count(before)\n    if count == 0:\n        if not after or after in content:\n            return\n        raise RuntimeError(f"{relative}: source block missing and replacement not present: {before[:120]!r}")\n    if count != 1:\n        raise RuntimeError(f"{relative}: expected at most one occurrence, found {count}: {before[:120]!r}")\n    write(relative, content.replace(before, after, 1))\n`;
if (source.includes(strictHelper)) {
  source = source.replace(strictHelper, idempotentHelper);
} else if (!source.includes(idempotentHelper)) {
  throw new Error("Could not make the feature patch idempotent.");
}

const temporaryPath = path.join(os.tmpdir(), `trustfirst-estimate-upgrade-${process.pid}.py`);
fs.writeFileSync(temporaryPath, source, "utf8");

const python = process.platform === "win32" ? "python" : "python3";
const result = spawnSync(python, [temporaryPath], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "inherit",
});

try {
  fs.unlinkSync(temporaryPath);
} catch {
  // Temporary cleanup is best effort.
}

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const quickPosTestPath = path.join(repoRoot, "apps/web/src/components/hardware/quick-pos-form.test.ts");
let quickPosTest = fs.readFileSync(quickPosTestPath, "utf8");
const testNeedle = `      cashierName: "Counter",\n      customer: {`;
const testReplacement = `      cashierName: "Counter",\n      customerAddress: "Test billing address",\n      customerName: "TEST CUSTOMER",\n      customer: {`;
if (quickPosTest.includes(testNeedle)) {
  quickPosTest = quickPosTest.replace(testNeedle, testReplacement);
  fs.writeFileSync(quickPosTestPath, quickPosTest, "utf8");
} else if (!quickPosTest.includes('customerAddress: "Test billing address"')) {
  throw new Error("Could not update the Quick POS preview test fixture.");
}

console.log("Estimate Bill upgrade materialized successfully.");
