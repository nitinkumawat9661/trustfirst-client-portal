import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await import("./finalize-post-bill-payment-flow.mjs");

const outputDir = "apps/web/public/internal-payment-flow";
mkdirSync(outputDir, { recursive: true });

for (const [source, target] of [
  ["apps/web/src/components/hardware/quick-pos-form.tsx", `${outputDir}/quick-pos-form.tsx.txt`],
  ["apps/web/src/components/hardware/estimate-bill-form.tsx", `${outputDir}/estimate-bill-form.tsx.txt`],
  ["apps/web/src/components/hardware/hardware-trade-form.tsx", `${outputDir}/hardware-trade-form.tsx.txt`],
  ["apps/web/src/components/hardware/bill-payment-choice-regression.test.ts", `${outputDir}/bill-payment-choice-regression.test.ts.txt`],
]) {
  copyFileSync(source, target);
}
