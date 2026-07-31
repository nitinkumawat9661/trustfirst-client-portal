from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:100]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "apps/web/src/server/hardware/types.ts",
    "  gstRateBps: number | null;\n  hsnCode: string | null;",
    "  gstRateBps: number | null;\n  hsnCode: string | null;\n  salesDiscountBps: number;",
)

replace_once(
    "apps/web/src/server/hardware/hardware-service.ts",
    "    gstRateBps: readInteger(gstTaxConfig.rateBps) ?? null,\n    hsnCode: readText(metadata.hsnCode) ?? null,",
    "    gstRateBps:\n      readRateBps(metadata.lastSalesGstRateBps) ??\n      readRateBps(gstTaxConfig.rateBps) ??\n      null,\n    hsnCode: readText(metadata.hsnCode) ?? null,",
)
replace_once(
    "apps/web/src/server/hardware/hardware-service.ts",
    "    purchaseCostCents: product.purchaseCostCents,\n    salesPriceCents: product.salesPriceCents,",
    "    purchaseCostCents: product.purchaseCostCents,\n    salesDiscountBps: readRateBps(metadata.lastSalesDiscountBps) ?? 0,\n    salesPriceCents: product.salesPriceCents,",
)
replace_once(
    "apps/web/src/server/hardware/hardware-service.ts",
    "function readInteger(value: unknown) {\n  return typeof value === \"number\" && Number.isInteger(value) ? value : undefined;\n}\n\nfunction validation(message: string) {",
    "function readInteger(value: unknown) {\n  return typeof value === \"number\" && Number.isInteger(value) ? value : undefined;\n}\n\nfunction readRateBps(value: unknown) {\n  const rate = readInteger(value);\n  return rate !== undefined && rate >= 0 && rate <= 10_000 ? rate : undefined;\n}\n\nfunction validation(message: string) {",
)

replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    "import { movementTypeForDocument, PrismaHardwareTradeRepository } from \"./trade-repository\";",
    "import { movementTypeForDocument, PrismaHardwareTradeRepository } from \"./trade-repository\";\nimport { persistLastSalesPreferences } from \"./sales-preferences\";",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    "      afterConfirm: async (tx, confirmedDocument) => {\n        const now = new Date();\n        if (confirmedDocument.type === HardwareTradeDocumentType.SALES_QUOTATION) {",
    "      afterConfirm: async (tx, confirmedDocument) => {\n        const now = new Date();\n        if (salesTypes.has(confirmedDocument.type)) {\n          await persistLastSalesPreferences(tx, context.tenantId, confirmedDocument.items);\n        }\n        if (confirmedDocument.type === HardwareTradeDocumentType.SALES_QUOTATION) {",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    "      for (const item of normalizedItems) {\n        await tx.hardwareInventoryMovement.create({\n          data: {\n            customerId: input.customerId ?? null,\n            locationId: input.locationId,\n            metadata: {\n              editIdempotencyKey: input.idempotencyKey,\n              stockMovementVersion: nextVersion,\n              tradeDocumentId: document.id,\n            },\n            productId: item.productId,\n            quantity: item.quantity,\n            referenceId: document.id,\n            referenceType: HardwareTradeDocumentType.SALES_QUOTATION,\n            tenantId: context.tenantId,\n            type: HardwareInventoryMovementType.STOCK_OUT,\n            unitPriceCents: item.unitAmountCents,\n          },\n        });\n      }\n\n      const receivable = await postSaleReceivable(tx, {",
    "      for (const item of normalizedItems) {\n        await tx.hardwareInventoryMovement.create({\n          data: {\n            customerId: input.customerId ?? null,\n            locationId: input.locationId,\n            metadata: {\n              editIdempotencyKey: input.idempotencyKey,\n              stockMovementVersion: nextVersion,\n              tradeDocumentId: document.id,\n            },\n            productId: item.productId,\n            quantity: item.quantity,\n            referenceId: document.id,\n            referenceType: HardwareTradeDocumentType.SALES_QUOTATION,\n            tenantId: context.tenantId,\n            type: HardwareInventoryMovementType.STOCK_OUT,\n            unitPriceCents: item.unitAmountCents,\n          },\n        });\n      }\n      await persistLastSalesPreferences(tx, context.tenantId, normalizedItems);\n\n      const receivable = await postSaleReceivable(tx, {",
)
replace_once(
    "apps/web/src/server/hardware/trade-service.ts",
    "      for (const item of trackedItems) {\n        await tx.hardwareInventoryMovement.create({\n          data: stripUndefined({\n            customerId: input.customerId,\n            locationId: input.locationId,\n            metadata: { idempotencyKey: input.idempotencyKey, tradeDocumentId: document.id },\n            productId: item.productId,\n            quantity: item.quantity,\n            referenceId: document.id,\n            referenceType: document.type,\n            tenantId: context.tenantId,\n            type: movementTypeForDocument(document.type),\n            unitPriceCents: item.unitAmountCents,\n          }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,\n        });\n      }\n      let payment = null;",
    "      for (const item of trackedItems) {\n        await tx.hardwareInventoryMovement.create({\n          data: stripUndefined({\n            customerId: input.customerId,\n            locationId: input.locationId,\n            metadata: { idempotencyKey: input.idempotencyKey, tradeDocumentId: document.id },\n            productId: item.productId,\n            quantity: item.quantity,\n            referenceId: document.id,\n            referenceType: document.type,\n            tenantId: context.tenantId,\n            type: movementTypeForDocument(document.type),\n            unitPriceCents: item.unitAmountCents,\n          }) as Prisma.HardwareInventoryMovementUncheckedCreateInput,\n        });\n      }\n      await persistLastSalesPreferences(tx, context.tenantId, normalizedItems);\n      let payment = null;",
)

replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    "      barcode: null,\n      gstRate: \"0\",\n      hsnCode: null,",
    "      barcode: null,\n      discountPercent: \"0\",\n      gstRate: \"0\",\n      hsnCode: null,",
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    "      barcode: product.barcode,\n      gstRate: \"0\",\n      hsnCode: product.hsnCode,",
    "      barcode: product.barcode,\n      discountPercent: formatRateBps(product.salesDiscountBps),\n      gstRate: formatRateBps(product.gstRateBps ?? 0),\n      hsnCode: product.hsnCode,",
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    "function isPlainEnter(event: KeyboardEvent<HTMLElement>) {\n  return event.key === \"Enter\" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;\n}\n\nfunction NumberField",
    "function isPlainEnter(event: KeyboardEvent<HTMLElement>) {\n  return event.key === \"Enter\" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;\n}\n\nfunction formatRateBps(value: number) {\n  return String(value / 100);\n}\n\nfunction NumberField",
)
replace_once(
    "apps/web/src/components/hardware/quick-pos-form.tsx",
    "Type a product and press Enter, enter quantity, then press Enter again for the next line. Spelling mistakes, partial names, and words in any order are supported.",
    "Type a product and press Enter. The first match is selected without a mouse, the last saved discount and GST are filled, then Enter moves through quantity, discount, GST, and the next product.",
)

replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    "      hsnCode: \"\",\n      productId: \"\",",
    "      discountPercent: \"0\",\n      gstRate: \"0\",\n      hsnCode: \"\",\n      productId: \"\",",
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    "      gstRate: \"0\",\n      hsnCode: product.hsnCode ?? \"\",",
    "      discountPercent: formatRateBps(product.salesDiscountBps),\n      gstRate: formatRateBps(product.gstRateBps ?? 0),\n      hsnCode: product.hsnCode ?? \"\",",
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    "function isPlainEnter(event: KeyboardEvent<HTMLElement>) {\n  return event.key === \"Enter\" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;\n}\n\nfunction Field",
    "function isPlainEnter(event: KeyboardEvent<HTMLElement>) {\n  return event.key === \"Enter\" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;\n}\n\nfunction formatRateBps(value: number) {\n  return String(value / 100);\n}\n\nfunction Field",
)
replace_once(
    "apps/web/src/components/hardware/estimate-bill-form.tsx",
    "Product → Enter → quantity → Enter → discount → Enter → GST → Enter → next product. Untouched blank rows do not block saving.",
    "Product → Enter selects the first match without a mouse and restores its last discount/GST. Then Enter moves through quantity → discount → GST → next product.",
)

replace_once(
    "apps/web/src/components/hardware/hardware-product-combobox.tsx",
    "          if (event.key !== \"Enter\") return;\n          event.preventDefault();\n          const product = results[activeIndex] ?? results[0];",
    "          if (\n            event.key !== \"Enter\" ||\n            event.shiftKey ||\n            event.altKey ||\n            event.ctrlKey ||\n            event.metaKey\n          ) return;\n          event.preventDefault();\n          event.stopPropagation();\n          const product = results[activeIndex] ?? results[0];",
)

replace_once(
    "e2e/mangalam-erp.spec.ts",
    "  const estimateProduct = page.getByRole(\"textbox\", { name: \"Product\", exact: true }).first();\n  await estimateProduct.fill(\"bathrom towel ring\");\n  await page.keyboard.press(\"Enter\");\n  const estimateQuantity = page.getByLabel(\"Qty\", { exact: true }).first();\n  await expect(estimateQuantity).toBeFocused();\n  await estimateQuantity.press(\"Enter\");\n  const estimateDiscount = page.getByLabel(\"Disc. %\", { exact: true }).first();\n  await expect(estimateDiscount).toBeFocused();\n  await estimateDiscount.fill(\"3\");\n  await estimateDiscount.press(\"Enter\");\n  const estimateItem = page.locator(\"fieldset\").filter({ hasText: \"Item 1\" }).first();\n  const estimateGst = estimateItem.locator(\"select\").first();\n  await expect(estimateGst).toBeFocused();\n  await estimateGst.selectOption(\"18\");",
    "  const estimateProduct = page.getByRole(\"textbox\", { name: \"Product\", exact: true }).first();\n  await estimateProduct.fill(\"basin ceramic\");\n  await page.keyboard.press(\"Enter\");\n  const estimateQuantity = page.getByLabel(\"Qty\", { exact: true }).first();\n  await expect(estimateQuantity).toBeFocused();\n  await estimateQuantity.press(\"Enter\");\n  const estimateDiscount = page.getByLabel(\"Disc. %\", { exact: true }).first();\n  await expect(estimateDiscount).toBeFocused();\n  await expect(estimateDiscount).toHaveValue(\"5\");\n  await estimateDiscount.fill(\"3\");\n  await estimateDiscount.press(\"Enter\");\n  const estimateItem = page.locator(\"fieldset\").filter({ hasText: \"Item 1\" }).first();\n  const estimateGst = estimateItem.locator(\"select\").first();\n  await expect(estimateGst).toBeFocused();\n  await expect(estimateGst).toHaveValue(\"18\");\n  await estimateGst.selectOption(\"12\");",
)
replace_once(
    "e2e/mangalam-erp.spec.ts",
    "  await page.waitForURL(new RegExp(`/admin/hardware/print/${documentId}`));\n  await expect(page.getByText(/Estimate Bill/i).first()).toBeVisible();\n});",
    "  await page.waitForURL(new RegExp(`/admin/hardware/print/${documentId}`));\n  await expect(page.getByText(/Estimate Bill/i).first()).toBeVisible();\n\n  await page.goto(\"/admin/hardware/sales/new\");\n  const rememberedProduct = page.getByRole(\"textbox\", { name: \"Product name / SKU\", exact: true }).first();\n  await rememberedProduct.fill(\"basin ceramic\");\n  await page.keyboard.press(\"Enter\");\n  const rememberedQuantity = page.getByLabel(\"Qty\", { exact: true }).first();\n  await expect(rememberedQuantity).toBeFocused();\n  await rememberedQuantity.press(\"Enter\");\n  const rememberedDiscount = page.getByLabel(\"Disc. %\", { exact: true }).first();\n  await expect(rememberedDiscount).toBeFocused();\n  await expect(rememberedDiscount).toHaveValue(\"3\");\n  await rememberedDiscount.press(\"Enter\");\n  const rememberedItem = page.locator(\"fieldset\").filter({ hasText: \"Item 1\" }).first();\n  const rememberedGst = rememberedItem.locator(\"select\").first();\n  await expect(rememberedGst).toBeFocused();\n  await expect(rememberedGst).toHaveValue(\"12\");\n});",
)

replace_once(
    "scripts/verify-staging-e2e.mjs",
    "  const estimateMovements = await prisma.hardwareInventoryMovement.count({\n    where: { referenceId: estimates[0].id, tenantId: estimates[0].tenantId },\n  });\n  if (estimateMovements < 3) {\n    throw new Error(\"Estimate create/edit did not create the expected stock-out and reversal movements.\");\n  }\n\n  console.log(\"MANGALAM_STAGING_E2E_DATABASE_VERIFIED\");",
    "  const estimateMovements = await prisma.hardwareInventoryMovement.count({\n    where: { referenceId: estimates[0].id, tenantId: estimates[0].tenantId },\n  });\n  if (estimateMovements < 3) {\n    throw new Error(\"Estimate create/edit did not create the expected stock-out and reversal movements.\");\n  }\n\n  const rememberedProductId = estimates[0].items[0]?.productId;\n  if (!rememberedProductId) throw new Error(\"Estimate item did not retain its product link.\");\n  const rememberedProduct = await prisma.hardwareProduct.findFirst({\n    where: { id: rememberedProductId, tenantId: estimates[0].tenantId },\n  });\n  if (!rememberedProduct) throw new Error(\"Remembered product was not found.\");\n  const rememberedMetadata = rememberedProduct.metadata && typeof rememberedProduct.metadata === \"object\" && !Array.isArray(rememberedProduct.metadata)\n    ? rememberedProduct.metadata\n    : {};\n  const rememberedGstConfig = rememberedProduct.gstTaxConfig && typeof rememberedProduct.gstTaxConfig === \"object\" && !Array.isArray(rememberedProduct.gstTaxConfig)\n    ? rememberedProduct.gstTaxConfig\n    : {};\n  if (rememberedMetadata.lastSalesDiscountBps !== 300) {\n    throw new Error(`Expected remembered discount 300 bps, found ${String(rememberedMetadata.lastSalesDiscountBps)}.`);\n  }\n  if (rememberedMetadata.lastSalesGstRateBps !== 1200 || rememberedGstConfig.rateBps !== 1200) {\n    throw new Error(\"Expected remembered GST to be 1200 bps in metadata and GST config.\");\n  }\n\n  console.log(\"MANGALAM_STAGING_E2E_DATABASE_VERIFIED\");",
)
replace_once(
    "scripts/verify-staging-e2e.mjs",
    "  console.log(`financial_transactions=${financials}`);",
    "  console.log(`financial_transactions=${financials}`);\n  console.log(`remembered_discount_bps=${rememberedMetadata.lastSalesDiscountBps}`);\n  console.log(`remembered_gst_bps=${rememberedMetadata.lastSalesGstRateBps}`);",
)

print("Product discount/GST preference source materialized.")
