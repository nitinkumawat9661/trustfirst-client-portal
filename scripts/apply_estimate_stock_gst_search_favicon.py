from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding="utf-8")


def replace_once(relative: str, old: str, new: str) -> None:
    content = read(relative)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {relative}, found {count}: {old[:120]!r}")
    write(relative, content.replace(old, new, 1))


def regex_once(relative: str, pattern: str, replacement: str, flags: int = 0) -> None:
    content = read(relative)
    updated, count = re.subn(pattern, replacement, content, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected exactly one regex match in {relative}, found {count}: {pattern[:120]!r}")
    write(relative, updated)


# Product search: retain the recent/favourite window when the query is blank,
# but show every ranked match once the user types a query.
replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    """      .sort((left, right) => {
        const scoreDifference = right.score - left.score;
        if (scoreDifference) return scoreDifference;
        const favoriteDifference = Number(favoriteSet.has(right.product.id)) - Number(favoriteSet.has(left.product.id));
        if (favoriteDifference) return favoriteDifference;
        const recentDifference = (recentRank.get(left.product.id) ?? 999) - (recentRank.get(right.product.id) ?? 999);
        if (recentDifference) return recentDifference;
        return localeCompare(left.product.name, right.product.name);
      })
      .slice(0, MAX_RESULTS);
""",
    """      .sort((left, right) => {
        const scoreDifference = right.score - left.score;
        if (scoreDifference) return scoreDifference;
        const favoriteDifference = Number(favoriteSet.has(right.product.id)) - Number(favoriteSet.has(left.product.id));
        if (favoriteDifference) return favoriteDifference;
        const recentDifference = (recentRank.get(left.product.id) ?? 999) - (recentRank.get(right.product.id) ?? 999);
        if (recentDifference) return recentDifference;
        return localeCompare(left.product.name, right.product.name);
      });
""",
)
replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    """          <p className="border-t border-border px-3 py-2 text-[11px] font-normal text-muted-foreground">
            ↑/↓ choose • Enter select • Esc close
          </p>
""",
    """          <p className="border-t border-border px-3 py-2 text-[11px] font-normal text-muted-foreground">
            {normalizedQuery ? `${results.length} matching products • ` : ""}↑/↓ choose • Enter select • Esc close
          </p>
""",
)
replace_once(
    "apps/web/src/components/hardware/creatable-combobox.tsx",
    """      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.option.label.localeCompare(right.option.label))
      .slice(0, 20)
      .map((entry) => entry.option);
""",
    """      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.option.label.localeCompare(right.option.label))
      .map((entry) => entry.option);
""",
)

trade_form = "apps/web/src/components/hardware/hardware-trade-form.tsx"
replace_once(
    trade_form,
    """const tradeFormSchema = z.object({
  customerAddress: z.string().max(1000),
  documentDate: z.string().min(1, "Date is required."),
""",
    """const tradeFormSchema = z.object({
  customerAddress: z.string().max(1000),
  documentDate: z.string().min(1, "Date is required."),
  locationId: z.string(),
""",
)
replace_once(
    trade_form,
    """export function HardwareTradeForm({
  mode,
  parties,
  products,
}: {
  mode: TradeMode;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
""",
    """export function HardwareTradeForm({
  locations = [],
  mode,
  parties,
  products,
}: {
  locations?: Array<{ id: string; name: string }>;
  mode: TradeMode;
  parties: HardwarePartySummary[];
  products: HardwareProductSummary[];
}) {
""",
)
replace_once(
    trade_form,
    """      documentType: defaultDocumentType(mode),
      items: [{ ...emptyItem }],
      partyId: "",
""",
    """      documentType: defaultDocumentType(mode),
      items: [{ ...emptyItem }],
      locationId: locations[0]?.id ?? "",
      partyId: "",
""",
)
replace_once(
    trade_form,
    """  const totals = useMemo(
    () => calculatePreview(watchedItems, watchedRoundOff, mode === "quotation"),
    [mode, watchedItems, watchedRoundOff],
  );
""",
    """  const totals = useMemo(
    () => calculatePreview(watchedItems, watchedRoundOff),
    [watchedItems, watchedRoundOff],
  );
""",
)
replace_once(
    trade_form,
    """  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "purchase" && parties.length === 0
        ? "Add at least one supplier before creating a purchase document."
        : null;
""",
    """  const disabledReason =
    products.length === 0
      ? "Add at least one verified product before creating a document."
      : mode === "purchase" && parties.length === 0
        ? "Add at least one supplier before creating a purchase document."
        : mode === "quotation" && locations.length === 0
          ? "Add at least one stock location before creating an Estimate Bill."
          : null;
""",
)
replace_once(
    trade_form,
    """      const partyId = await resolveCustomerId(values);
      if (!partyId) {
""",
    """      const partyId = await resolveCustomerId(values);
      if (mode === "quotation" && !values.locationId) {
        setServerError("Select a stock location for this Estimate Bill.");
        return;
      }
      if (!partyId) {
""",
)
replace_once(
    trade_form,
    """            taxRateBps: mode === "quotation" ? 0 : Math.round(Number(item.gstRate) * 100),
""",
    """            taxRateBps: Math.round(Number(item.gstRate) * 100),
""",
)
replace_once(
    trade_form,
    """          customerAddress: mode === "purchase" ? undefined : values.customerAddress.trim() || null,
          documentDate: values.documentDate,
          estimateBill: mode === "quotation",
          gstFree: mode === "quotation",
          paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
          paymentMode: values.paymentMode,
          referenceNumber: values.referenceNumber || null,
          taxMode: mode === "quotation" ? "gst-free" : values.taxMode,
""",
    """          customerAddress: mode === "purchase" ? undefined : values.customerAddress.trim() || null,
          documentDate: values.documentDate,
          estimateBill: mode === "quotation",
          gstFilingEligible: mode !== "purchase" && values.items.some((item) => Number(item.gstRate) > 0),
          paidAmountCents: mode === "purchase" ? Math.round(Number(values.paidAmount || 0) * 100) : undefined,
          paymentMode: values.paymentMode,
          referenceNumber: values.referenceNumber || null,
          stockMovementOnConfirm: mode === "quotation",
          taxMode: values.taxMode,
""",
)
replace_once(
    trade_form,
    """      if (mode === "quotation") {
        router.push(`/admin/hardware/print/${result.data.id}?print=1`);
      } else {
        router.push(mode === "purchase" ? "/admin/hardware/purchases?created=1" : "/admin/hardware/sales?created=1");
      }
""",
    """      if (mode === "quotation") {
        const confirmation = await postHardwareJson<unknown>(`/api/hardware/trade/${result.data.id}/confirm`, {
          locationId: values.locationId,
        });
        if (!confirmation.ok) {
          setServerError(`Estimate Bill ${result.data.documentNumber} was saved as a draft, but stock could not be deducted: ${confirmation.message}`);
          return;
        }
        router.push(`/admin/hardware/print/${result.data.id}?print=1`);
      } else {
        router.push(mode === "purchase" ? "/admin/hardware/purchases?created=1" : "/admin/hardware/sales?created=1");
      }
""",
)
replace_once(
    trade_form,
    """          {mode !== "quotation" ? (
            <FormField label="Tax treatment">
              <select className={selectClassName} {...register("taxMode")}>
                <option value="intra-state">Intra-state (CGST + SGST)</option>
                <option value="inter-state">Inter-state (IGST)</option>
              </select>
            </FormField>
          ) : (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
              <p className="font-medium">GST-free Estimate Bill</p>
              <p className="mt-1 text-xs text-muted-foreground">GST is fixed at 0% and no stock movement is posted.</p>
            </div>
          )}
""",
    """          <FormField label="Tax treatment">
            <select className={selectClassName} {...register("taxMode")}>
              <option value="intra-state">Intra-state (CGST + SGST)</option>
              <option value="inter-state">Inter-state (IGST)</option>
            </select>
          </FormField>
          {mode === "quotation" ? (
            <>
              <FormField label="Stock location" required>
                <select className={selectClassName} {...register("locationId")}>
                  <option value="">Select stock location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </FormField>
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                <p className="font-medium">Estimate Bill with stock movement</p>
                <p className="mt-1 text-xs text-muted-foreground">Each line starts at 0% GST. Selected GST lines are included in the sales GST report, and confirmed quantities are deducted from this location.</p>
              </div>
            </>
          ) : null}
""",
)
replace_once(
    trade_form,
    """              {mode === "quotation" ? (
                <div className="lg:col-span-1">
                  <FormField label="GST"><Input disabled value="0%" /></FormField>
                </div>
              ) : (
                <div className="lg:col-span-1">
                  <FormField error={errors.items?.[index]?.gstRate?.message} label="GST %">
                    <GstRateSelect value={watchedItems?.[index]?.gstRate ?? "0"} {...register(`items.${index}.gstRate`)} />
                  </FormField>
                </div>
              )}
""",
    """              <div className="lg:col-span-1">
                <FormField error={errors.items?.[index]?.gstRate?.message} label="GST %">
                  <GstRateSelect value={watchedItems?.[index]?.gstRate ?? "0"} {...register(`items.${index}.gstRate`)} />
                </FormField>
              </div>
""",
)
replace_once(
    trade_form,
    """            <TotalRow label={mode === "quotation" ? "Net estimate value" : "Taxable value"} value={totals.taxableCents} />
            {mode !== "quotation" ? <TotalRow label="GST" value={totals.taxCents} /> : null}
""",
    """            <TotalRow label="Taxable value" value={totals.taxableCents} />
            <TotalRow label="GST" value={totals.taxCents} />
""",
)
replace_once(
    trade_form,
    """function calculatePreview(
  items: TradeFormValues["items"] | undefined,
  roundOff: string | undefined,
  gstFree: boolean,
) {
""",
    """function calculatePreview(
  items: TradeFormValues["items"] | undefined,
  roundOff: string | undefined,
) {
""",
)
replace_once(
    trade_form,
    """    const tax = gstFree ? 0 : Math.round(taxable * (Number(item.gstRate) || 0) / 100);
""",
    """    const tax = Math.round(taxable * (Number(item.gstRate) || 0) / 100);
""",
)

replace_once(
    "apps/web/src/app/(platform)/admin/hardware/quotations/new/page.tsx",
    """  const [parties, products] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
  ]);
""",
    """  const [parties, products, locations] = await Promise.all([
    service.listParties(context, "customer"),
    service.listProducts(context),
    service.listLocations(context),
  ]);
""",
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/quotations/new/page.tsx",
    """        description="Create a saved GST-free estimate with the same advanced product search as billing. Saving opens the printable A4 Estimate Bill."
""",
    """        description="Create a saved Estimate Bill with editable line-wise GST, automatic GST reporting for taxed lines, immediate stock deduction, and direct A4 printing."
""",
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/quotations/new/page.tsx",
    """      <HardwareTradeForm mode="quotation" parties={parties} products={products} />
""",
    """      <HardwareTradeForm locations={locations} mode="quotation" parties={parties} products={products} />
""",
)
replace_once(
    "apps/web/src/app/(platform)/admin/hardware/quotations/page.tsx",
    """        description="Create and save a GST-free estimate, then print or reprint it directly. Estimates do not move stock."
""",
    """        description="Create and save Estimate Bills with optional line-wise GST. Confirmed quantities deduct stock, taxed lines feed the sales GST report, and every document can be printed or reprinted."
""",
)

print_page = "apps/web/src/app/(platform)/admin/hardware/print/[documentId]/page.tsx"
replace_once(
    print_page,
    """            {isEstimate ? (
              <p className="mt-2 font-semibold">GST-free estimate · No stock movement</p>
            ) : (
              <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            )}
""",
    """            <p className="mt-2">Tax treatment: {taxMode === "inter-state" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
            {isEstimate ? <p className="mt-1 font-semibold">Confirmed Estimate Bill · Stock deducted</p> : null}
""",
)
replace_once(
    print_page,
    """              {!isEstimate ? <col style={{ width: "6%" }} /> : null}
              <col style={{ width: isEstimate ? "16%" : "10%" }} />
""",
    """              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
""",
)
replace_once(
    print_page,
    """                {!isEstimate ? <th className="px-2 py-2 text-right">GST</th> : null}
""",
    """                <th className="px-2 py-2 text-right">GST</th>
""",
)
replace_once(
    print_page,
    """                  {!isEstimate ? <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td> : null}
""",
    """                  <td className="px-2 py-2 text-right">{item.taxRateBps / 100}%</td>
""",
)
replace_once(
    print_page,
    """            <p className="text-xs font-semibold uppercase">{isEstimate ? "Estimate summary" : "Tax summary"}</p>
            {isEstimate ? (
              <p className="mt-2 text-xs">GST-free Estimate Bill. This document does not reserve or move stock.</p>
            ) : projection.gstSummary.length ? (
""",
    """            <p className="text-xs font-semibold uppercase">Tax summary</p>
            {projection.gstSummary.length ? (
""",
)
replace_once(
    print_page,
    """            {!isEstimate ? <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} /> : null}
""",
    """            <AmountRow label={taxMode === "inter-state" ? "IGST" : "CGST + SGST"} value={projection.document.taxCents} />
""",
)

replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    """    const nonStockDocument =
      document.type === HardwareTradeDocumentType.SALES_QUOTATION ||
      document.type === HardwareTradeDocumentType.PURCHASE_ORDER;
""",
    """    const nonStockDocument = document.type === HardwareTradeDocumentType.PURCHASE_ORDER;
""",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    """      salesGstCents: documents
        .filter((document) =>
          document.type === HardwareTradeDocumentType.SALES_ORDER &&
          document.status === "CONFIRMED",
        )
        .reduce((total, document) => total + document.taxCents, 0),
""",
    """      salesGstCents: documents
        .filter((document) =>
          (document.type === HardwareTradeDocumentType.SALES_ORDER ||
            document.type === HardwareTradeDocumentType.SALES_QUOTATION) &&
          document.status === "CONFIRMED",
        )
        .reduce((total, document) => total + document.taxCents, 0),
""",
)

replace_once(
    "apps/web/src/components/hardware/estimate-bill-gst.test.ts",
    """  it("forces Estimate Bill tax to zero even when a line contains a GST value", () => {
    const estimate = hardwareTradeFormTestUtils.calculatePreview([{
      discountPercent: "0",
      gstRate: "18",
      hsnCode: "",
      productId: "product-1",
      productName: "Test product",
      quantity: "2",
      unitCode: "PCS",
      unitRate: "100",
    }], "0", true);

    expect(estimate.grossCents).toBe(20_000);
    expect(estimate.taxCents).toBe(0);
    expect(estimate.totalCents).toBe(20_000);
  });
""",
    """  it("keeps Estimate Bill GST editable per line and defaults other lines to zero", () => {
    const estimate = hardwareTradeFormTestUtils.calculatePreview([{
      discountPercent: "0",
      gstRate: "18",
      hsnCode: "",
      productId: "product-1",
      productName: "Taxed product",
      quantity: "2",
      unitCode: "PCS",
      unitRate: "100",
    }, {
      discountPercent: "0",
      gstRate: "0",
      hsnCode: "",
      productId: "product-2",
      productName: "Zero-rated product",
      quantity: "1",
      unitCode: "PCS",
      unitRate: "50",
    }], "0");

    expect(estimate.grossCents).toBe(25_000);
    expect(estimate.taxCents).toBe(3_600);
    expect(estimate.totalCents).toBe(28_600);
  });
""",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.test.ts",
    """    expect(movementTypeForDocument(HardwareTradeDocumentType.SALES_ORDER)).toBe(HardwareInventoryMovementType.STOCK_OUT);
""",
    """    expect(movementTypeForDocument(HardwareTradeDocumentType.SALES_ORDER)).toBe(HardwareInventoryMovementType.STOCK_OUT);
    expect(movementTypeForDocument(HardwareTradeDocumentType.SALES_QUOTATION)).toBe(HardwareInventoryMovementType.STOCK_OUT);
""",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.test.ts",
    """            {
              createdAt: new Date(),
              paymentStatus: "unpaid",
              status: HardwareTradeDocumentStatus.CONFIRMED,
              taxCents: 9000,
              totalCents: 50_000,
              type: HardwareTradeDocumentType.SUPPLIER_BILL,
            },
""",
    """            {
              createdAt: new Date(),
              paymentStatus: "unpaid",
              status: HardwareTradeDocumentStatus.CONFIRMED,
              taxCents: 9000,
              totalCents: 50_000,
              type: HardwareTradeDocumentType.SUPPLIER_BILL,
            },
            {
              createdAt: new Date(),
              paymentStatus: "unlinked",
              status: HardwareTradeDocumentStatus.CONFIRMED,
              taxCents: 1800,
              totalCents: 11_800,
              type: HardwareTradeDocumentType.SALES_QUOTATION,
            },
""",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.test.ts",
    """    expect(report.outstandingCustomersCents).toBe(55_000);
    expect(report.outstandingSuppliersCents).toBe(50_000);
""",
    """    expect(report.outstandingCustomersCents).toBe(55_000);
    expect(report.outstandingSuppliersCents).toBe(50_000);
    expect(report.salesGstCents).toBe(1_800);
""",
)

branding = "apps/web/src/server/domain/app-branding.ts"
replace_once(
    branding,
    """const mangalamLogo = "/api/public/branding/mangalam-sanitary-logo";
""",
    """const mangalamLogo = "/api/public/branding/mangalam-sanitary-logo";
const mangalamIcon = `${mangalamLogo}?v=20260729`;
""",
)
replace_once(
    branding,
    """      icons: {
        apple: mangalamLogo,
        icon: mangalamLogo,
      },
""",
    """      icons: {
        apple: mangalamIcon,
        icon: mangalamIcon,
        shortcut: mangalamIcon,
      },
""",
)
replace_once(
    branding,
    """      icons: {
        apple: mangalamLogo,
        icon: mangalamLogo,
      },
""",
    """      icons: {
        apple: mangalamIcon,
        icon: mangalamIcon,
        shortcut: mangalamIcon,
      },
""",
)
replace_once(branding, """            src: mangalamLogo,
            type: "image/jpeg",
""", """            src: mangalamIcon,
""")
replace_once(branding, """            src: mangalamLogo,
            type: "image/jpeg",
""", """            src: mangalamIcon,
""")

favicon = ROOT / "apps/web/src/app/favicon.ico"
if favicon.exists():
    favicon.unlink()

print("Estimate GST, stock movement, complete product search, GST reporting, and Mangalam favicon fixes materialized.")
