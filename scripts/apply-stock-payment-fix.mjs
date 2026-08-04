import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
}

const path = "apps/web/src/components/hardware/quick-pos-form.tsx";
let source = readFileSync(path, "utf8");

source = replaceOnce(
  source,
  'import { buildWhatsAppBillUrl } from "@/server/hardware/whatsapp";\n',
  'import { resolveBillPayment, type BillPaymentChoice } from "@/lib/hardware/payment-choice";\nimport { buildWhatsAppBillUrl } from "@/server/hardware/whatsapp";\n',
  "Quick POS payment helper import",
);
source = replaceOnce(
  source,
  '  const [paid, setPaid] = useState("0");\n  const [paymentMode, setPaymentMode] = useState("CASH");\n',
  '  const [paid, setPaid] = useState("");\n  const [paymentChoice, setPaymentChoice] = useState<BillPaymentChoice>("");\n  const [paymentMode, setPaymentMode] = useState("CASH");\n',
  "Quick POS payment choice state",
);
source = replaceOnce(
  source,
  '  const totals = useMemo(() => calculateTotals(completedLines, paid, invoiceDiscount), [completedLines, invoiceDiscount, paid]);\n',
  '  const totals = useMemo(\n    () => calculateTotals(completedLines, paid, invoiceDiscount, paymentChoice),\n    [completedLines, invoiceDiscount, paid, paymentChoice],\n  );\n',
  "Quick POS payment-aware totals",
);
source = replaceOnce(
  source,
  '  async function postBill(options: { printAfterPost?: boolean } = {}) {\n    setServerError(null);\n    setPrintStatus(null);\n    setSaving(true);\n',
  '  async function postBill(options: { printAfterPost?: boolean } = {}) {\n    setServerError(null);\n    setPrintStatus(null);\n    let resolvedPayment: ReturnType<typeof resolveBillPayment>;\n    try {\n      resolvedPayment = resolveBillPayment({\n        choice: paymentChoice,\n        enteredPaidAmountCents: paid.trim() ? Math.round(Number(paid) * 100) : null,\n        paymentMode,\n        totalCents: totals.totalCents,\n      });\n    } catch (error) {\n      setServerError(error instanceof Error ? error.message : "Select the bill payment status.");\n      return;\n    }\n    setSaving(true);\n',
  "Quick POS explicit payment validation",
);
source = replaceOnce(
  source,
  '      paidAmountCents: totals.paidCents,\n      paymentMode: totals.paidCents > 0 ? paymentMode : undefined,\n',
  '      paidAmountCents: resolvedPayment.paidAmountCents,\n      paymentMode: resolvedPayment.paidAmountCents > 0 ? resolvedPayment.paymentMode : undefined,\n',
  "Quick POS resolved payment payload",
);
source = replaceOnce(
  source,
  '            <label className="grid gap-2 font-medium">\n              Paid\n              <Input inputMode="decimal" min="0" step="0.01" type="number" value={paid} onChange={(event) => setPaid(event.target.value)} />\n            </label>\n            <label className="grid gap-2 font-medium">\n              Payment mode\n              <select className={selectClassName} disabled={totals.paidCents <= 0} value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>\n                <option value="CASH">Cash</option>\n                <option value="UPI">UPI</option>\n                <option value="CARD">Card</option>\n                <option value="BANK_TRANSFER">Bank transfer</option>\n                <option value="CHEQUE">Cheque</option>\n                <option value="OTHER">Other</option>\n              </select>\n            </label>\n',
  '            <label className="grid gap-2 font-medium">\n              Payment status\n              <select\n                className={selectClassName}\n                value={paymentChoice}\n                onChange={(event) => {\n                  const choice = event.target.value as BillPaymentChoice;\n                  setPaymentChoice(choice);\n                  if (choice !== "partial") setPaid("");\n                }}\n              >\n                <option value="">Select paid or unpaid</option>\n                <option value="unpaid">Unpaid / credit</option>\n                <option value="paid">Paid in full</option>\n                <option value="partial">Partially paid</option>\n              </select>\n            </label>\n            {paymentChoice === "paid" || paymentChoice === "partial" ? (\n              <label className="grid gap-2 font-medium">\n                Payment mode\n                <select className={selectClassName} value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>\n                  <option value="CASH">Cash</option>\n                  <option value="UPI">UPI</option>\n                  <option value="CARD">Card</option>\n                  <option value="BANK_TRANSFER">Bank transfer</option>\n                  <option value="CHEQUE">Cheque</option>\n                  <option value="OTHER">Other</option>\n                </select>\n              </label>\n            ) : null}\n            {paymentChoice === "partial" ? (\n              <label className="grid gap-2 font-medium">\n                Paid amount\n                <Input inputMode="decimal" min="0.01" step="0.01" type="number" value={paid} onChange={(event) => setPaid(event.target.value)} />\n              </label>\n            ) : null}\n            {paymentChoice === "paid" ? (\n              <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">\n                Full payment of {money(totals.totalCents)} will be recorded.\n              </p>\n            ) : null}\n            {paymentChoice === "unpaid" ? (\n              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">\n                The full balance will remain outstanding for this customer.\n              </p>\n            ) : null}\n',
  "Quick POS payment status UI",
);
source = replaceOnce(
  source,
  '            <Button className="w-full" disabled={saving || confirmed || !canPost || !locationId} onClick={() => postBill()} type="button">\n',
  '            <Button className="w-full" disabled={saving || confirmed || !canPost || !locationId || !paymentChoice} onClick={() => postBill()} type="button">\n',
  "Quick POS post requires payment choice",
);
source = replaceOnce(
  source,
  '            <Button className="w-full" disabled={saving || postingPrint || (!confirmed && (!canPost || !locationId))} onClick={postAndPrint} type="button" variant="outline">\n',
  '            <Button className="w-full" disabled={saving || postingPrint || (!confirmed && (!canPost || !locationId || !paymentChoice))} onClick={postAndPrint} type="button" variant="outline">\n',
  "Quick POS print requires payment choice",
);
source = replaceOnce(
  source,
  'function calculateTotals(lines: PosLine[], paid: string, invoiceDiscount: string) {\n',
  'function calculateTotals(lines: PosLine[], paid: string, invoiceDiscount: string, paymentChoice: BillPaymentChoice) {\n',
  "Quick POS totals signature",
);
source = replaceOnce(
  source,
  '  const paidCents = Math.round((Number(paid) || 0) * 100);\n  return { ...totals, balanceCents: Math.max(roundedTotal - paidCents, 0), invoiceDiscountCents, paidCents, roundOffCents: roundedTotal - rawTotal, totalCents: roundedTotal };\n',
  '  const enteredPaidCents = Math.round((Number(paid) || 0) * 100);\n  const paidCents = paymentChoice === "paid"\n    ? roundedTotal\n    : paymentChoice === "partial"\n      ? enteredPaidCents\n      : 0;\n  return { ...totals, balanceCents: Math.max(roundedTotal - paidCents, 0), invoiceDiscountCents, paidCents, roundOffCents: roundedTotal - rawTotal, totalCents: roundedTotal };\n',
  "Quick POS totals paid amount",
);

writeFileSync(path, source);
console.log("QUICK_POS_PAYMENT_CHOICE_APPLIED");
