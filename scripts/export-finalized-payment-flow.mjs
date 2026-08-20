import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const quickPosPath = "apps/web/src/components/hardware/quick-pos-form.tsx";
const estimatePath = "apps/web/src/components/hardware/estimate-bill-form.tsx";
const regressionPath =
  "apps/web/src/components/hardware/bill-payment-choice-regression.test.ts";
const quickPosBefore = readFileSync(quickPosPath, "utf8");
const estimateBefore = readFileSync(estimatePath, "utf8");
const alreadyPrepared =
  quickPosBefore.includes("BillPaymentConfirmationDialog") &&
  estimateBefore.includes("BillPaymentConfirmationDialog");

if (!alreadyPrepared) {
  writeFileSync(
    regressionPath,
    `import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const estimateSource = readFileSync(new URL("./estimate-bill-form.tsx", import.meta.url), "utf8");
const quickPosSource = readFileSync(new URL("./quick-pos-form.tsx", import.meta.url), "utf8");

describe("customer bill payment choice", () => {
  it("requires paid, unpaid, or partial status in Estimate Bills", () => {
    expect(estimateSource).toContain("resolveBillPayment");
    expect(estimateSource).toContain("Select paid or unpaid");
    expect(estimateSource).not.toContain("blank = full for non-credit");
  });

  it("requires the same explicit status in Quick POS invoices", () => {
    expect(quickPosSource).toContain("resolveBillPayment");
    expect(quickPosSource).toContain("Select paid or unpaid");
    expect(quickPosSource).toContain("!paymentChoice");
  });
});
`,
  );
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

await import("./apply-billing-interaction-fixes.mjs");
