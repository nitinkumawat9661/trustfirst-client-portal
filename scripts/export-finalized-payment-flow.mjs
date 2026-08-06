import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
await import("./finalize-post-bill-payment-flow.mjs");

const estimatePath = "apps/web/src/components/hardware/estimate-bill-form.tsx";
const malformedBoundary = "function isPlainEnter    </div>\n  );\n}\n\nfunction isPlainEnter";
const estimateSource = readFileSync(estimatePath, "utf8");
if (!estimateSource.includes(malformedBoundary)) {
  throw new Error("Expected Estimate Bill dialog boundary was not generated.");
}
writeFileSync(
  estimatePath,
  estimateSource.replace(malformedBoundary, "function isPlainEnter"),
);

const quickPosPath = "apps/web/src/components/hardware/quick-pos-form.tsx";
const pendingPrintSource = "setPendingPostOptions({ printAfterPost: options.printAfterPost });";
const quickPosSource = readFileSync(quickPosPath, "utf8");
if (!quickPosSource.includes(pendingPrintSource)) {
  throw new Error("Expected Quick POS pending print option was not generated.");
}
writeFileSync(
  quickPosPath,
  quickPosSource.replace(
    pendingPrintSource,
    "setPendingPostOptions(options.printAfterPost ? { printAfterPost: true } : {});",
  ),
);

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
