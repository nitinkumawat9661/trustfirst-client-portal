import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const quickPosPath = "apps/web/src/components/hardware/quick-pos-form.tsx";
const estimatePath = "apps/web/src/components/hardware/estimate-bill-form.tsx";
const quickPosBefore = readFileSync(quickPosPath, "utf8");
const estimateBefore = readFileSync(estimatePath, "utf8");
const alreadyPrepared =
  quickPosBefore.includes("BillPaymentConfirmationDialog") &&
  estimateBefore.includes("BillPaymentConfirmationDialog");

if (!alreadyPrepared) {
  await import("./finalize-post-bill-payment-flow.mjs");
}

const malformedBoundary =
  "function isPlainEnter    </div>\n  );\n}\n\nfunction isPlainEnter";
const estimateSource = readFileSync(estimatePath, "utf8");
if (estimateSource.includes(malformedBoundary)) {
  writeFileSync(
    estimatePath,
    estimateSource.replace(malformedBoundary, "function isPlainEnter"),
  );
} else if (!estimateSource.includes("BillPaymentConfirmationDialog")) {
  throw new Error("Estimate Bill payment confirmation was not prepared.");
}

const pendingPrintSource =
  "setPendingPostOptions({ printAfterPost: options.printAfterPost });";
const quickPosSource = readFileSync(quickPosPath, "utf8");
if (quickPosSource.includes(pendingPrintSource)) {
  writeFileSync(
    quickPosPath,
    quickPosSource.replace(
      pendingPrintSource,
      "setPendingPostOptions(options.printAfterPost ? { printAfterPost: true } : {});",
    ),
  );
} else if (!quickPosSource.includes("BillPaymentConfirmationDialog")) {
  throw new Error("Quick POS payment confirmation was not prepared.");
}
