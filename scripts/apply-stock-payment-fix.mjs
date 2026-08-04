import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
}

function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  return source.split(before).join(after);
}

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${path}: transform made no change`);
  writeFileSync(path, after);
}

update("apps/web/src/components/hardware/estimate-bill-form.tsx", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    'import { calculateEstimateMoneyTotals } from "@/lib/hardware/estimate-money";\n',
    'import { calculateEstimateMoneyTotals } from "@/lib/hardware/estimate-money";\nimport { resolveBillPayment, type BillPaymentChoice, type ResolvedBillPayment } from "@/lib/hardware/payment-choice";\n',
    "estimate payment helper import",
  );
  source = replaceOnce(
    source,
    '  const [paymentMode, setPaymentMode] = useState(initialDocument?.paymentMode ?? "Cash");\n',
    '  const [paymentChoice, setPaymentChoice] = useState<BillPaymentChoice>(() => {\n    if (!initialDocument) return "";\n    if (initialDocument.paidAmountCents <= 0) return "unpaid";\n    return initialDocument.paidAmountCents >= calculateInitialDocumentTotal(initialDocument) ? "paid" : "partial";\n  });\n  const [paymentMode, setPaymentMode] = useState(\n    initialDocument?.paymentMode && initialDocument.paymentMode !== "Credit"\n      ? initialDocument.paymentMode\n      : "Cash",\n  );\n',
    "estimate payment choice state",
  );
  source = replaceOnce(
    source,
    '  function buildTradeInput(resolvedCustomerId: string) {\n',
    '  function buildTradeInput(resolvedCustomerId: string, resolvedPayment: ResolvedBillPayment) {\n',
    "estimate build input signature",
  );
  source = replaceOnce(
    source,
    '      paidAmountCents: paidAmount.trim()\n        ? Math.round(Number(paidAmount) * 100)\n        : paymentMode === "Credit"\n          ? 0\n          : totals.totalCents,\n      paymentMode,\n',
    '      paidAmountCents: resolvedPayment.paidAmountCents,\n      paymentMode: resolvedPayment.paymentMode,\n',
    "estimate remove implicit full payment",
  );
  source = replaceOnce(
    source,
    '    const enteredPaidCents = paidAmount.trim() ? Math.round(Number(paidAmount) * 100) : null;\n    const paidAmountCents = enteredPaidCents ?? (paymentMode === "Credit" ? 0 : totals.totalCents);\n    if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0 || paidAmountCents > totals.totalCents) {\n      return setServerError("Paid amount must be between zero and the Estimate Bill total.");\n    }\n\n    setSaving(true);\n',
    '    let resolvedPayment: ResolvedBillPayment;\n    try {\n      resolvedPayment = resolveBillPayment({\n        choice: paymentChoice,\n        enteredPaidAmountCents: paidAmount.trim() ? Math.round(Number(paidAmount) * 100) : null,\n        paymentMode,\n        totalCents: totals.totalCents,\n      });\n    } catch (error) {\n      return setServerError(error instanceof Error ? error.message : "Select the bill payment status.");\n    }\n\n    setSaving(true);\n',
    "estimate explicit payment validation",
  );
  source = replaceOnce(
    source,
    '      const tradeInput = buildTradeInput(resolvedCustomerId);\n',
    '      const tradeInput = buildTradeInput(resolvedCustomerId, resolvedPayment);\n',
    "estimate resolved payment input",
  );
  source = replaceOnce(
    source,
    '          <Field label="Payment mode">\n            <select className={selectClassName} onChange={(event) => setPaymentMode(event.target.value)} value={paymentMode}>\n              {["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other", "Credit"].map((option) => <option key={option}>{option}</option>)}\n            </select>\n          </Field>\n          <Field label="Paid amount (blank = full for non-credit)">\n            <Input inputMode="decimal" min="0" onChange={(event) => setPaidAmount(event.target.value)} step="0.01" type="number" value={paidAmount} />\n          </Field>\n',
    '          <Field label="Payment status">\n            <select\n              className={selectClassName}\n              onChange={(event) => {\n                const choice = event.target.value as BillPaymentChoice;\n                setPaymentChoice(choice);\n                if (choice !== "partial") setPaidAmount("");\n              }}\n              value={paymentChoice}\n            >\n              <option value="">Select paid or unpaid</option>\n              <option value="unpaid">Unpaid / credit</option>\n              <option value="paid">Paid in full</option>\n              <option value="partial">Partially paid</option>\n            </select>\n          </Field>\n          {paymentChoice === "paid" || paymentChoice === "partial" ? (\n            <Field label="Payment mode">\n              <select className={selectClassName} onChange={(event) => setPaymentMode(event.target.value)} value={paymentMode}>\n                {["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"].map((option) => <option key={option}>{option}</option>)}\n              </select>\n            </Field>\n          ) : null}\n          {paymentChoice === "partial" ? (\n            <Field label="Paid amount">\n              <Input inputMode="decimal" min="0.01" onChange={(event) => setPaidAmount(event.target.value)} step="0.01" type="number" value={paidAmount} />\n            </Field>\n          ) : null}\n          {paymentChoice === "paid" ? (\n            <p className="self-end rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">\n              Full payment of {money(totals.totalCents)} will be recorded when the bill is generated.\n            </p>\n          ) : null}\n          {paymentChoice === "unpaid" ? (\n            <p className="self-end rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">\n              This bill will be generated as unpaid and added to the customer outstanding balance.\n            </p>\n          ) : null}\n',
    "estimate payment status UI",
  );
  source = replaceOnce(
    source,
    'function calculateLineTotal(line: EstimateLine) {\n',
    'function calculateInitialDocumentTotal(document: HardwareEstimateEditData) {\n  return calculateEstimateMoneyTotals(document.items.map((item) => ({\n    discountCents: Math.round(item.quantity * item.unitRateCents * item.discountPercent / 100),\n    quantity: item.quantity,\n    taxRateBps: Math.round(item.gstRate * 100),\n    unitAmountCents: item.unitRateCents,\n  }))).totalCents;\n}\n\nfunction calculateLineTotal(line: EstimateLine) {\n',
    "estimate initial payment choice total",
  );
  return source;
});

update("apps/web/src/server/hardware/trade-service.ts", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    '    const stockItems = isEstimateSale\n      ? document.items\n      : document.items.filter((item) => !isStockSetupPending(item.product?.metadata));\n',
    '    const stockItems = document.items;\n',
    "confirm every stock item",
  );
  source = replaceOnce(
    source,
    '    const trackedItems = normalizedItems.filter((item) => !isStockSetupPending(products.get(item.productId)?.metadata));\n',
    '    const trackedItems = normalizedItems;\n',
    "quick POS tracks every item",
  );
  source = replaceOnce(
    source,
    '          for (const item of document.items.filter((candidate) => !isStockSetupPending(candidate.product?.metadata))) {\n',
    '          for (const item of document.items) {\n',
    "cancellation restores every item",
  );
  source = replaceCount(
    source,
    '      for (const item of returnItems.filter((candidate) => !isStockSetupPending(originalItems.get(readString(asRecord(candidate.metadata).originalItemId) ?? "")?.product?.metadata))) {\n',
    '      for (const item of returnItems) {\n',
    2,
    "returns move every item",
  );
  source = replaceOnce(
    source,
    '      const original = originalItems.get(readString(asRecord(item.metadata).originalItemId) ?? "");\n      if (isStockSetupPending(original?.product?.metadata)) continue;\n',
    '      const original = originalItems.get(readString(asRecord(item.metadata).originalItemId) ?? "");\n',
    "purchase return checks every item",
  );
  source = replaceOnce(
    source,
    '    const isEstimateSale = document.type === HardwareTradeDocumentType.SALES_QUOTATION;\n    for (const item of document.items) {\n      if (!isEstimateSale && isStockSetupPending(item.product?.metadata)) continue;\n',
    '    for (const item of document.items) {\n',
    "stock availability checks every item",
  );
  source = replaceOnce(
    source,
    '\nfunction isStockSetupPending(value: unknown) {\n  return asRecord(value).stockSetupStatus === "PENDING";\n}\n',
    '\n',
    "remove obsolete pending-stock bypass",
  );
  if (source.includes("isStockSetupPending")) {
    throw new Error("trade service still contains pending-stock bypasses");
  }
  return source;
});

update("apps/web/src/server/hardware/hardware-service.ts", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    'function toProductSummary(product: ProductRecord, movements: MovementRecord[]): HardwareProductSummary {\n  const currentStock = stockForProduct(movements.filter((movement) => movement.productId === product.id));\n',
    'function toProductSummary(product: ProductRecord, movements: MovementRecord[]): HardwareProductSummary {\n  const productMovements = movements.filter((movement) => movement.productId === product.id);\n  const currentStock = stockForProduct(productMovements);\n',
    "derive product movement state",
  );
  source = replaceOnce(
    source,
    '    stockSetupStatus: metadata.stockSetupStatus === "PENDING" ? "PENDING" : "TRACKED",\n',
    '    stockSetupStatus: metadata.stockSetupStatus === "PENDING" && productMovements.length === 0 ? "PENDING" : "TRACKED",\n',
    "self-heal tracked product summaries",
  );
  return source;
});

update("apps/web/src/lib/offline-data/product-result.ts", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    '  name: string;\n  purchaseCostCents?: number;\n',
    '  name: string;\n  openingStock?: { locationId: string; quantity: number };\n  purchaseCostCents?: number;\n',
    "offline product opening stock type",
  );
  source = replaceOnce(
    source,
    '  const gstTaxConfig = asRecord(rawPayload.gstTaxConfig);\n  return validateOfflineProductInput({\n',
    '  const gstTaxConfig = asRecord(rawPayload.gstTaxConfig);\n  const stockLevel = asRecord(rawPayload.stockLevel);\n  return validateOfflineProductInput({\n',
    "read catalog stock level",
  );
  source = replaceOnce(
    source,
    '    name: rawPayload.name,\n    purchaseCostCents: rawPayload.purchaseCostCents,\n',
    '    name: rawPayload.name,\n    openingStock: Object.keys(stockLevel).length ? stockLevel : undefined,\n    purchaseCostCents: rawPayload.purchaseCostCents,\n',
    "map catalog stock level",
  );
  source = replaceOnce(
    source,
    '  const hsnCode = optionalText(rawInput.hsnCode, 12)?.toUpperCase();\n',
    '  const hsnCode = optionalText(rawInput.hsnCode, 12)?.toUpperCase();\n  const openingStockRecord = asRecord(rawInput.openingStock);\n  const openingStock = Object.keys(openingStockRecord).length\n    ? {\n        locationId: optionalUuid(openingStockRecord.locationId, "Stock location") as string,\n        quantity: nonNegativeInteger(openingStockRecord.quantity, "Stock level"),\n      }\n    : undefined;\n  if (openingStock && !openingStock.locationId) throw new Error("Select a stock location when setting stock level.");\n',
    "validate offline opening stock",
  );
  source = replaceOnce(
    source,
    '    name,\n    purchaseCostCents,\n',
    '    name,\n    ...(openingStock ? { openingStock } : {}),\n    purchaseCostCents,\n',
    "return offline opening stock",
  );
  source = replaceOnce(
    source,
    '  const lowStockThreshold = input.lowStockThreshold ?? 0;\n  return {\n',
    '  const lowStockThreshold = input.lowStockThreshold ?? 0;\n  const currentStock = input.openingStock?.quantity ?? 0;\n  return {\n',
    "offline queued stock summary",
  );
  source = replaceOnce(
    source,
    '    currentStock: 0,\n',
    '    currentStock,\n',
    "offline queued current stock",
  );
  source = replaceOnce(
    source,
    '    lowStock: 0 <= lowStockThreshold,\n',
    '    lowStock: currentStock <= lowStockThreshold,\n',
    "offline queued low stock",
  );
  source = replaceOnce(
    source,
    '    stockSetupStatus: "PENDING",\n',
    '    stockSetupStatus: input.openingStock ? "TRACKED" : "PENDING",\n',
    "offline queued setup status",
  );
  return source;
});

update("apps/web/src/components/hardware/hardware-product-form.tsx", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    'import { patchHardwareJson, postHardwareProductJson } from "./hardware-api-client";\n',
    'import { patchHardwareJson, postHardwareProductJson, postHardwareStockJson } from "./hardware-api-client";\n',
    "product stock API import",
  );
  source = replaceOnce(
    source,
    '  sku: z.string().trim().max(120),\n  unitId: z.string(),\n',
    '  sku: z.string().trim().max(120),\n  stockLevel: z.string().refine((value) => value === "" || /^\\d+$/u.test(value), {\n    message: "Stock level must be a non-negative whole number.",\n  }),\n  stockLocationId: z.string(),\n  unitId: z.string(),\n',
    "product stock form schema",
  );
  source = replaceOnce(
    source,
    'type UnitOption = { code: string; id: string; name: string };\ntype SavedProductResult = { offlineQueued?: boolean };\n',
    'type UnitOption = { code: string; id: string; name: string };\ntype StockLocationOption = { currentStock: number; id: string; name: string };\ntype SavedProductResult = { id?: string; offlineQueued?: boolean };\n',
    "product stock location type",
  );
  source = replaceOnce(
    source,
    '  categories,\n  product,\n  units,\n}: {\n  brands: LookupOption[];\n  categories: LookupOption[];\n  product?: HardwareProductFormProduct;\n  units: UnitOption[];\n',
    '  categories,\n  locations,\n  product,\n  units,\n}: {\n  brands: LookupOption[];\n  categories: LookupOption[];\n  locations: StockLocationOption[];\n  product?: HardwareProductFormProduct;\n  units: UnitOption[];\n',
    "product locations prop",
  );
  source = replaceOnce(
    source,
    '    handleSubmit,\n    register,\n    watch,\n',
    '    handleSubmit,\n    register,\n    setValue,\n    watch,\n',
    "product setValue",
  );
  source = replaceOnce(
    source,
    '      sku: product?.sku ?? "",\n      unitId: product?.unitId ?? "",\n',
    '      sku: product?.sku ?? "",\n      stockLevel: isEditing ? String(locations[0]?.currentStock ?? 0) : "",\n      stockLocationId: locations[0]?.id ?? "",\n      unitId: product?.unitId ?? "",\n',
    "product stock defaults",
  );
  source = replaceOnce(
    source,
    '  const currentSalePrice = watch("salePrice");\n  const canSubmit = currentName.trim().length >= 2 && moneyPattern.test(currentSalePrice) && Number(currentSalePrice) > 0;\n',
    '  const currentSalePrice = watch("salePrice");\n  const selectedStockLocationId = watch("stockLocationId");\n  const selectedStockLocation = locations.find((location) => location.id === selectedStockLocationId);\n  const canSubmit = currentName.trim().length >= 2 && moneyPattern.test(currentSalePrice) && Number(currentSalePrice) > 0;\n',
    "product selected stock location",
  );
  source = replaceOnce(
    source,
    '    const commonPayload = {\n',
    '    const stockLevel = values.stockLevel === "" ? null : Number(values.stockLevel);\n    if (stockLevel !== null && !values.stockLocationId) {\n      setServerError("Select a stock location when setting stock level.");\n      return;\n    }\n    const initialStock = locations.find((location) => location.id === values.stockLocationId)?.currentStock ?? 0;\n    const stockChanged = stockLevel !== null && (!isEditing || stockLevel !== initialStock);\n    const commonPayload = {\n',
    "product stock submit state",
  );
  source = replaceOnce(
    source,
    '      metadata: { hsnCode: values.hsnCode.trim().toUpperCase() || null },\n',
    '      metadata: {\n        hsnCode: values.hsnCode.trim().toUpperCase() || null,\n        ...(stockLevel !== null ? { stockSetupPendingAt: null, stockSetupStatus: "TRACKED" } : {}),\n      },\n',
    "product tracked metadata",
  );
  source = replaceOnce(
    source,
    '          ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),\n          ...(values.unitId ? { unitId: values.unitId } : {}),\n',
    '          ...(values.sku.trim() ? { sku: values.sku.trim() } : {}),\n          ...(stockLevel !== null ? { stockLevel: { locationId: values.stockLocationId, quantity: stockLevel } } : {}),\n          ...(values.unitId ? { unitId: values.unitId } : {}),\n',
    "product offline opening stock payload",
  );
  source = replaceOnce(
    source,
    '    if (!result.ok) {\n      setServerError(result.message);\n      return;\n    }\n    const status = result.data.offlineQueued ? "queued" : isEditing ? "updated" : "created";\n',
    '    if (!result.ok) {\n      setServerError(result.message);\n      return;\n    }\n    if (stockChanged && !result.data.offlineQueued) {\n      if (!result.data.id) {\n        setServerError("Product was saved, but its stock identity was not returned. Refresh and set stock from Inventory.");\n        return;\n      }\n      const stockResult = await postHardwareStockJson(\n        {\n          locationId: values.stockLocationId,\n          notes: "Stock level set from product section",\n          productId: result.data.id,\n          quantity: stockLevel as number,\n          referenceId: result.data.id,\n          referenceType: "product_form",\n          type: "ADJUSTMENT",\n        },\n        initialStock,\n        {\n          locationName: selectedStockLocation?.name ?? null,\n          productName: values.name.trim(),\n        },\n      );\n      if (!stockResult.ok) {\n        setServerError(`Product details were saved, but stock level was not updated: ${stockResult.message}`);\n        return;\n      }\n    }\n    const status = result.data.offlineQueued ? "queued" : isEditing ? "updated" : "created";\n',
    "product stock movement after save",
  );
  source = replaceOnce(
    source,
    '          <p className="text-sm text-muted-foreground">Product name and sale price are required. A new product can be queued offline; edits to existing products require internet.</p>\n',
    '          <div className="grid gap-4 rounded-md border border-border bg-muted/30 p-4 md:grid-cols-2">\n            <Field error={errors.stockLevel?.message} label={isEditing ? "Stock level at selected location" : "Opening stock level"}>\n              <Input inputMode="numeric" min="0" placeholder={isEditing ? undefined : "Optional"} step="1" type="number" {...register("stockLevel")} />\n            </Field>\n            <Field label="Stock location">\n              <select\n                className={selectClassName}\n                {...register("stockLocationId", {\n                  onChange: (event) => {\n                    const location = locations.find((candidate) => candidate.id === event.target.value);\n                    setValue("stockLevel", isEditing ? String(location?.currentStock ?? 0) : "", { shouldDirty: true });\n                  },\n                })}\n              >\n                <option value="">Select stock location</option>\n                {locations.map((location) => (\n                  <option key={location.id} value={location.id}>{location.name}{isEditing ? ` — current ${location.currentStock}` : ""}</option>\n                ))}\n              </select>\n            </Field>\n          </div>\n          <p className="text-sm text-muted-foreground">Product name and sale price are required. Stock can be set here for a selected location. A new product can be queued offline; edits to existing products require internet.</p>\n',
    "product stock UI",
  );
  return source;
});

update("apps/web/src/app/(platform)/admin/hardware/products/new/page.tsx", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    '  const [brands, categories, units] = await Promise.all([\n    service.listBrands(context),\n    service.listCategories(context),\n    service.listUnits(context),\n  ]);\n',
    '  const [brands, categories, locations, units] = await Promise.all([\n    service.listBrands(context),\n    service.listCategories(context),\n    service.listLocations(context),\n    service.listUnits(context),\n  ]);\n',
    "new product locations",
  );
  source = replaceOnce(
    source,
    '      <HardwareProductForm brands={brands} categories={categories} units={units} />\n',
    '      <HardwareProductForm\n        brands={brands}\n        categories={categories}\n        locations={locations.map((location) => ({ currentStock: 0, id: location.id, name: location.name }))}\n        units={units}\n      />\n',
    "new product location props",
  );
  return source;
});

update("apps/web/src/app/(platform)/admin/hardware/products/[productId]/edit/page.tsx", (initial) => {
  let source = initial;
  source = replaceOnce(
    source,
    'import { HardwareService } from "@/server/hardware";\n',
    'import { HardwareService, stockForProduct } from "@/server/hardware";\n',
    "edit product stock helper import",
  );
  source = replaceOnce(
    source,
    '  const service = new HardwareService(getPrisma());\n  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };\n  const { productId } = await params;\n  const [products, brands, categories, units] = await Promise.all([\n    service.listProducts(context),\n    service.listBrands(context),\n    service.listCategories(context),\n    service.listUnits(context),\n  ]);\n',
    '  const prisma = getPrisma();\n  const service = new HardwareService(prisma);\n  const context = { tenantId: user.activeTenantId ?? "public", userId: user.id };\n  const { productId } = await params;\n  const [products, brands, categories, locations, movements, units] = await Promise.all([\n    service.listProducts(context),\n    service.listBrands(context),\n    service.listCategories(context),\n    service.listLocations(context),\n    prisma.hardwareInventoryMovement.findMany({\n      select: { locationId: true, quantity: true, type: true },\n      where: { productId, tenantId: context.tenantId },\n    }),\n    service.listUnits(context),\n  ]);\n',
    "edit product location stock query",
  );
  source = replaceOnce(
    source,
    '        categories={categories}\n        product={{\n',
    '        categories={categories}\n        locations={locations.map((location) => ({\n          currentStock: stockForProduct(movements.filter((movement) => movement.locationId === location.id)),\n          id: location.id,\n          name: location.name,\n        }))}\n        product={{\n',
    "edit product location props",
  );
  return source;
});

console.log("STOCK_PAYMENT_CODEMOD_APPLIED");
