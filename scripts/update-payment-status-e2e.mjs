import { readFileSync, writeFileSync } from "node:fs";

const path = "e2e/mangalam-erp.spec.ts";
let source = readFileSync(path, "utf8");
const replacements = [
  [
    'await page.getByLabel("Payment status", { exact: true }).selectOption("unpaid");',
    'await page.getByTestId("quick-pos-payment-status").selectOption("unpaid");',
  ],
  [
    'await page.getByLabel("Payment status", { exact: true }).selectOption("unpaid");',
    'await page.getByTestId("estimate-payment-status").selectOption("unpaid");',
  ],
];
for (const [before, after] of replacements) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Expected E2E selector not found: ${before}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}
if (source.includes('getByLabel("Payment status"')) throw new Error("Legacy payment-status label selectors remain");
writeFileSync(path, source);
console.log("PAYMENT_STATUS_E2E_SELECTORS_UPDATED");
