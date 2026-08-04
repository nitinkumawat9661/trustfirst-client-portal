import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${path}: no change`);
  writeFileSync(path, after);
}

update("apps/web/src/components/hardware/quick-pos-form.tsx", (source) => replaceOnce(
  source,
  '              <select\n                className={selectClassName}\n                value={paymentChoice}\n',
  '              <select\n                className={selectClassName}\n                data-testid="quick-pos-payment-status"\n                value={paymentChoice}\n',
  "Quick POS payment status test ID",
));

update("apps/web/src/components/hardware/estimate-bill-form.tsx", (source) => replaceOnce(
  source,
  '            <select\n              className={selectClassName}\n              onChange={(event) => {\n                const choice = event.target.value as BillPaymentChoice;\n',
  '            <select\n              className={selectClassName}\n              data-testid="estimate-payment-status"\n              onChange={(event) => {\n                const choice = event.target.value as BillPaymentChoice;\n',
  "Estimate payment status test ID",
));

console.log("PAYMENT_STATUS_TESTIDS_ADDED");
