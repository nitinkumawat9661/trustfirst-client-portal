import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, search, replacement, label) {
  const index = source.indexOf(search);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(search, index + search.length) >= 0) {
    throw new Error(`Multiple matches for ${label}`);
  }
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

function replaceSection(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing start for ${label}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`Missing end for ${label}`);
  return source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
}

function insertBefore(source, marker, addition, label) {
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`Missing marker for ${label}`);
  return source.slice(0, index) + addition + source.slice(index);
}

function update(path, transform) {
  const original = readFileSync(path, "utf8");
  const next = transform(original);
  if (next === original) throw new Error(`No changes produced for ${path}`);
  writeFileSync(path, next);
}

update("apps/web/src/components/hardware/quick-pos-form.tsx", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    'import { resolveBillPayment, type BillPaymentChoice } from "../../lib/hardware/payment-choice";',
    'import { type BillPaymentChoice, type ResolvedBillPayment } from "../../lib/hardware/payment-choice";',
    "Quick POS payment type import",
  );
  source = replaceOnce(
    source,
    'import { canPostBillingLines, completedBillingLines } from "./billing-lines";',
    'import { canPostBillingLines, completedBillingLines } from "./billing-lines";\nimport { BillPaymentConfirmationDialog } from "./bill-payment-confirmation-dialog";',
    "Quick POS dialog import",
  );
  source = replaceOnce(
    source,
    '  const [paymentMode, setPaymentMode] = useState("CASH");',
    '  const [paymentMode, setPaymentMode] = useState("CASH");\n  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);\n  const [pendingPostOptions, setPendingPostOptions] = useState<{ printAfterPost?: boolean } | null>(null);',
    "Quick POS payment dialog state",
  );
  source = replaceSection(
    source,
    '  async function postBill(options: { printAfterPost?: boolean } = {}) {',
    '    setSaving(true);',
    `  async function postBill(options: { payment?: ResolvedBillPayment; printAfterPost?: boolean } = {}) {
    setServerError(null);
    setPrintStatus(null);
    if (!options.payment) {
      setPendingPostOptions({ printAfterPost: options.printAfterPost });
      setPaymentDialogOpen(true);
      return;
    }
    const resolvedPayment = options.payment;
    setSaving(true);`,
    "Quick POS deferred payment gate",
  );
  source = replaceOnce(
    source,
    `    setPosted(result.data);
    setConfirmed(true);
    if (options.printAfterPost) {
      printCurrentBill({ postedSale: result.data });
    }`,
    `    const finalChoice: BillPaymentChoice = resolvedPayment.paidAmountCents <= 0
      ? "unpaid"
      : resolvedPayment.paidAmountCents >= totals.totalCents
        ? "paid"
        : "partial";
    const finalPaidAmount = resolvedPayment.paidAmountCents > 0
      ? String(resolvedPayment.paidAmountCents / 100)
      : "";
    setPaymentChoice(finalChoice);
    setPaid(finalPaidAmount);
    setPaymentMode(resolvedPayment.paymentMode);
    setPosted(result.data);
    setConfirmed(true);
    if (options.printAfterPost) {
      const finalTotals = calculateTotals(completedLines, finalPaidAmount, invoiceDiscount, finalChoice);
      const finalPreview = buildBillPreview({
        cashierName,
        customer: selectedCustomer,
        customerAddress,
        customerName,
        firm: defaultFirm,
        lines: completedLines,
        notes,
        paidCents: resolvedPayment.paidAmountCents,
        paymentMode: resolvedPayment.paymentMode,
        posted: result.data,
        totals: finalTotals,
      });
      setPrintStatus(openA4PrintWindow({
        ...finalPreview,
        documentNumber: result.data.invoiceNumber ?? result.data.documentNumber,
        statusLabel: "FINAL INVOICE",
      }));
    }`,
    "Quick POS final payment state",
  );
  source = replaceSection(
    source,
    `            <label className="grid gap-2 font-medium">
              Payment status`,
    `            <TotalRow label="Balance" value={totals.balanceCents} />`,
    `            <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Payment is confirmed on the next screen after you click Post bill. The selected status then drives the customer ledger, receipt and outstanding balance.
            </div>
            <TotalRow label="Current draft balance" value={totals.balanceCents} />`,
    "Quick POS inline payment controls",
  );
  source = replaceOnce(
    source,
    'disabled={saving || confirmed || !canPost || !locationId || !paymentChoice}',
    'disabled={saving || confirmed || !canPost || !locationId}',
    "Quick POS post button gate",
  );
  source = replaceOnce(
    source,
    'disabled={saving || postingPrint || (!confirmed && (!canPost || !locationId || !paymentChoice))}',
    'disabled={saving || postingPrint || (!confirmed && (!canPost || !locationId))}',
    "Quick POS print button gate",
  );
  source = insertBefore(
    source,
    '      {quickAdd ? (',
    `      <BillPaymentConfirmationDialog
        creditAllowed={Boolean(customerId || customerName.trim())}
        defaultChoice={paymentChoice}
        defaultMode={paymentMode}
        direction="receivable"
        onCancel={() => {
          setPaymentDialogOpen(false);
          setPendingPostOptions(null);
        }}
        onConfirm={({ choice, payment }) => {
          const pendingOptions = pendingPostOptions ?? {};
          setPaymentChoice(choice);
          setPaid(payment.paidAmountCents > 0 ? String(payment.paidAmountCents / 100) : "");
          setPaymentMode(payment.paymentMode);
          setPaymentDialogOpen(false);
          setPendingPostOptions(null);
          void postBill({ ...pendingOptions, payment });
        }}
        open={paymentDialogOpen}
        partyName={customerName || selectedCustomer?.name || ""}
        paymentModes={[
          { label: "Cash", value: "CASH" },
          { label: "UPI", value: "UPI" },
          { label: "Card", value: "CARD" },
          { label: "Bank transfer", value: "BANK_TRANSFER" },
          { label: "Cheque", value: "CHEQUE" },
          { label: "Other", value: "OTHER" },
        ]}
        totalCents={totals.totalCents}
      />
`,
    "Quick POS payment dialog render",
  );
  return source;
});

update("apps/web/src/components/hardware/estimate-bill-form.tsx", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    'import { resolveBillPayment, type BillPaymentChoice, type ResolvedBillPayment } from "../../lib/hardware/payment-choice";',
    'import { type BillPaymentChoice, type ResolvedBillPayment } from "../../lib/hardware/payment-choice";',
    "Estimate payment type import",
  );
  source = replaceOnce(
    source,
    'import { nextBillingLineAction } from "./billing-keyboard";',
    'import { nextBillingLineAction } from "./billing-keyboard";\nimport { BillPaymentConfirmationDialog } from "./bill-payment-confirmation-dialog";',
    "Estimate dialog import",
  );
  source = replaceOnce(
    source,
    '  const [paymentMode, setPaymentMode] = useState(',
    '  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);\n  const [paymentMode, setPaymentMode] = useState(',
    "Estimate payment dialog state",
  );
  source = replaceSection(
    source,
    '  async function saveAndPrint() {',
    '    setSaving(true);',
    `  async function saveAndPrint(resolvedPayment?: ResolvedBillPayment) {
    setServerError(null);
    if (!locationId) return setServerError("Select a stock location.");
    if (!canSaveEstimate) return setServerError("Select every product and enter valid quantity and rate. Untouched blank rows are allowed.");
    if (!resolvedPayment) {
      setPaymentDialogOpen(true);
      return;
    }

    setSaving(true);`,
    "Estimate deferred payment gate",
  );
  source = replaceSection(
    source,
    `          <Field label="Payment status">`,
    `          {paymentChoice === "unpaid" ? (
            <p className="self-end rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              This bill will be generated as unpaid and added to the customer outstanding balance.
            </p>
          ) : null}`,
    `          <div className="self-end rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Paid, unpaid, or partial status is confirmed after you click Save. That final choice controls the customer ledger, receipt and outstanding balance.
          </div>`,
    "Estimate inline payment controls",
  );
  source = replaceOnce(
    source,
    '        <Button disabled={saving || Boolean(queuedDocumentNumber)} onClick={saveAndPrint} type="button">',
    '        <Button disabled={saving || Boolean(queuedDocumentNumber)} onClick={() => void saveAndPrint()} type="button">',
    "Estimate save button",
  );
  source = insertBefore(
    source,
    '    </div>\n  );\n}',
    `      <BillPaymentConfirmationDialog
        creditAllowed={Boolean(customerId || customerName.trim())}
        defaultChoice={paymentChoice}
        defaultMode={paymentMode}
        direction="receivable"
        onCancel={() => setPaymentDialogOpen(false)}
        onConfirm={({ choice, payment }) => {
          setPaymentChoice(choice);
          setPaidAmount(payment.paidAmountCents > 0 ? String(payment.paidAmountCents / 100) : "");
          setPaymentMode(payment.paymentMode);
          setPaymentDialogOpen(false);
          void saveAndPrint(payment);
        }}
        open={paymentDialogOpen}
        partyName={customerName}
        paymentModes={[
          { label: "Cash", value: "Cash" },
          { label: "UPI", value: "UPI" },
          { label: "Bank Transfer", value: "Bank Transfer" },
          { label: "Cheque", value: "Cheque" },
          { label: "Card", value: "Card" },
          { label: "Other", value: "Other" },
        ]}
        totalCents={totals.totalCents}
      />
`,
    "Estimate payment dialog render",
  );
  return source;
});

update("apps/web/src/components/hardware/hardware-trade-form.tsx", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    'import type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";',
    'import type { ResolvedBillPayment } from "@/lib/hardware/payment-choice";\nimport type { HardwarePartySummary, HardwareProductSummary } from "@/server/hardware";',
    "Trade payment type import",
  );
  source = replaceOnce(
    source,
    'import { CreatableCombobox } from "./creatable-combobox";',
    'import { BillPaymentConfirmationDialog } from "./bill-payment-confirmation-dialog";\nimport { CreatableCombobox } from "./creatable-combobox";',
    "Trade dialog import",
  );
  source = replaceOnce(
    source,
    '  const [serverError, setServerError] = useState<string | null>(null);',
    '  const [serverError, setServerError] = useState<string | null>(null);\n  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);\n  const [pendingPurchase, setPendingPurchase] = useState<{ partyId: string; values: TradeFormValues } | null>(null);',
    "Trade payment dialog state",
  );
  source = replaceOnce(
    source,
    `      : mode === "quotation" && locations.length === 0
        ? "Add at least one stock location before creating an Estimate Bill."
        : null;`,
    `      : mode === "quotation" && locations.length === 0
        ? "Add at least one stock location before creating an Estimate Bill."
        : mode === "purchase" && locations.length === 0
          ? "Add at least one stock location before creating a Purchase Entry or Supplier Bill."
          : null;`,
    "Trade purchase location requirement",
  );
  source = replaceOnce(
    source,
    '  async function onSubmit(values: TradeFormValues) {',
    '  async function submitTrade(values: TradeFormValues, purchasePayment?: ResolvedBillPayment, resolvedPartyId?: string) {',
    "Trade submit signature",
  );
  source = replaceOnce(
    source,
    '      const partyId = await resolvePartyId(values);',
    '      const partyId = resolvedPartyId ?? await resolvePartyId(values);',
    "Trade resolved party reuse",
  );
  source = replaceOnce(
    source,
    `      if (mode === "quotation" && !values.locationId) {
        setServerError("Select a stock location for this Estimate Bill.");
        return;
      }`,
    `      if (mode === "quotation" && !values.locationId) {
        setServerError("Select a stock location for this Estimate Bill.");
        return;
      }
      if (mode === "purchase" && values.documentType !== "PURCHASE_ORDER" && !values.locationId) {
        setServerError("Select the stock location receiving this purchase.");
        return;
      }`,
    "Trade purchase location validation",
  );
  source = replaceOnce(
    source,
    `      if (!partyId) {
        setServerError(mode === "purchase" ? "Select a supplier." : "Enter or select a customer name.");
        return;
      }

      const endpoint`,
    `      if (!partyId) {
        setServerError(mode === "purchase" ? "Select a supplier." : "Enter or select a customer name.");
        return;
      }
      if (mode === "purchase" && values.documentType !== "PURCHASE_ORDER" && !purchasePayment) {
        setPendingPurchase({ partyId, values });
        setPaymentDialogOpen(true);
        return;
      }

      const endpoint`,
    "Trade purchase payment gate",
  );
  source = replaceOnce(
    source,
    `          paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
          paymentMode: values.paymentMode,`,
    `          paidAmountCents: mode === "purchase" ? purchasePayment?.paidAmountCents ?? 0 : undefined,
          paymentMode: mode === "purchase" ? purchasePayment?.paymentMode ?? "Credit" : values.paymentMode,`,
    "Trade purchase payment metadata",
  );
  source = replaceOnce(
    source,
    `      if (mode === "quotation") {`,
    [
      '      if (mode === "purchase" && values.documentType !== "PURCHASE_ORDER" && navigator.onLine) {',
      '        const confirmation = await postHardwareJson<unknown>(',
      '          `/api/hardware/trade/${result.data.id}/confirm`,',
      '          { locationId: values.locationId },',
      '        );',
      '        if (!confirmation.ok) {',
      '          setServerError(`${documentTitle(mode)} ${result.data.documentNumber} was saved as a draft, but final stock and supplier-ledger posting failed: ${confirmation.message}`);',
      '          return;',
      '        }',
      '      }',
      '',
      '      if (mode === "quotation") {',
    ].join("\n"),
    "Trade online purchase confirmation",
  );
  source = replaceOnce(
    source,
    '<form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>',
    '<form className="space-y-5" onSubmit={handleSubmit((values) => submitTrade(values))}>',
    "Trade form submit handler",
  );
  source = insertBefore(
    source,
    `          {mode === "quotation" ? (
            <>`,
    `          {mode === "purchase" ? (
            <FormField label="Stock location" required>
              <select className={selectClassName} {...register("locationId")}>
                <option value="">Select receiving location</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </FormField>
          ) : null}
`,
    "Trade purchase location field",
  );
  source = replaceOnce(
    source,
    '{mode !== "quotation" ? (',
    '{mode === "sale" ? (',
    "Trade inline payment mode visibility",
  );
  source = replaceSection(
    source,
    `          {mode === "purchase" ? (
            <FormField error={errors.paidAmount?.message} label="Paid amount (INR)">`,
    `          ) : null}`,
    "",
    "Trade inline purchase paid amount",
  );
  source = insertBefore(
    source,
    '    </form>\n  );\n}',
    `      <BillPaymentConfirmationDialog
        creditAllowed={Boolean(pendingPurchase?.partyId || partyName.trim())}
        defaultMode="Cash"
        direction="payable"
        onCancel={() => {
          setPaymentDialogOpen(false);
          setPendingPurchase(null);
        }}
        onConfirm={({ payment }) => {
          const pending = pendingPurchase;
          if (!pending) return;
          setPaymentDialogOpen(false);
          setPendingPurchase(null);
          void submitTrade(pending.values, payment, pending.partyId);
        }}
        open={paymentDialogOpen}
        partyName={partyName}
        paymentModes={[
          { label: "Cash", value: "Cash" },
          { label: "UPI", value: "UPI" },
          { label: "Bank Transfer", value: "Bank Transfer" },
          { label: "Cheque", value: "Cheque" },
          { label: "Card", value: "Card" },
          { label: "Other", value: "Other" },
        ]}
        totalCents={totals.totalCents}
      />
`,
    "Trade purchase payment dialog render",
  );
  return source;
});

update("apps/web/src/app/(platform)/admin/hardware/purchases/new/page.tsx", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    `  const [parties, products] = await Promise.all([
    service.listParties(context, "supplier"),
    service.listProducts(context),
  ]);`,
    `  const [parties, products, locations] = await Promise.all([
    service.listParties(context, "supplier"),
    service.listProducts(context),
    service.listLocations(context),
  ]);`,
    "Purchase page location loading",
  );
  source = replaceOnce(
    source,
    '<HardwareTradeForm mode="purchase" parties={parties} products={products} />',
    '<HardwareTradeForm locations={locations} mode="purchase" parties={parties} products={products} />',
    "Purchase page location prop",
  );
  return source;
});

update("apps/web/src/components/hardware/bill-payment-choice-regression.test.ts", () => `import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dialogSource = readFileSync(new URL("./bill-payment-confirmation-dialog.tsx", import.meta.url), "utf8");
const estimateSource = readFileSync(new URL("./estimate-bill-form.tsx", import.meta.url), "utf8");
const purchaseSource = readFileSync(new URL("./hardware-trade-form.tsx", import.meta.url), "utf8");
const quickPosSource = readFileSync(new URL("./quick-pos-form.tsx", import.meta.url), "utf8");

describe("post-bill payment accounting confirmation", () => {
  it("uses one explicit payment screen for customer bills", () => {
    expect(dialogSource).toContain("How was this bill paid?");
    expect(dialogSource).toContain("Paid in full");
    expect(dialogSource).toContain("Unpaid / credit");
    expect(dialogSource).toContain("Partially paid");
    expect(estimateSource).toContain("BillPaymentConfirmationDialog");
    expect(quickPosSource).toContain("BillPaymentConfirmationDialog");
    expect(quickPosSource).not.toContain("!paymentChoice");
  });

  it("uses the same decision for supplier payable posting", () => {
    expect(dialogSource).toContain("How was this purchase paid?");
    expect(purchaseSource).toContain('direction="payable"');
    expect(purchaseSource).toContain("purchasePayment?.paidAmountCents");
    expect(purchaseSource).toContain("final stock and supplier-ledger posting failed");
  });
});
`);

const dialogPath = "apps/web/src/components/hardware/bill-payment-confirmation-dialog.tsx";
let dialog = readFileSync(dialogPath, "utf8");
dialog = replaceOnce(
  dialog,
  "Confirm this before final posting. The bill, ledger entry, payment entry, stock movement and outstanding balance will be saved together.",
  "Confirm this before final posting. The selected status stays attached to the bill so ledger, payment, stock and outstanding records are posted consistently.",
  "Dialog atomic wording",
);
writeFileSync(dialogPath, dialog);
