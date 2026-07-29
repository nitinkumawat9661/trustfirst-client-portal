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

const brokenMarker = `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    "  const haystack`;
const brokenStart = source.indexOf(brokenMarker);
if (brokenStart >= 0) {
  const brokenEnd = source.indexOf("\n)\n", brokenStart);
  if (brokenEnd < 0) throw new Error("Could not isolate generated haystack patch block.");
  const replacement = `replace_once(\n    "apps/web/src/components/hardware/creatable-combobox.tsx",\n    '  const haystack = [label, sku, barcode, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(" ");\\n',\n    '  const haystack = [label, sku, brand, category, price, ...(option.keywords ?? []).map(normalize)].join(" ");\\n',\n)\n`;
  source = source.slice(0, brokenStart) + replacement + source.slice(brokenEnd + 3);
}

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
console.log("Estimate Bill upgrade materialized successfully.");
