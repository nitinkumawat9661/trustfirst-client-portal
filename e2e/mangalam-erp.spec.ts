import { expect, test } from "@playwright/test";

const adminEmail = process.env.MANGLAM_DEMO_ADMIN_EMAIL ?? "mangalam-staging-admin@trustfirst.example.com";
const adminPassword = process.env.MANGLAM_DEMO_ADMIN_PASSWORD ?? "MangalamStaging!2026";
const runSuffix = process.env.E2E_RUN_SUFFIX ?? "local";
const partyName = `E2E Dual Role Traders ${runSuffix}`;

test("customer, supplier, sale, purchase, Estimate Bill and isolated printing work end to end", async ({ page }) => {
  await page.context().addInitScript(() => {
    Object.defineProperty(window, "print", {
      configurable: true,
      value: () => {
        document.documentElement.dataset.nativePrintCalled = "true";
      },
    });
  });

  await page.goto("/sign-in?callbackUrl=/admin/hardware/sales/new");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await page.waitForURL(/\/admin\/hardware\/sales\/new/);

  const customerInput = page.getByRole("textbox", { name: "Customer", exact: true });
  await customerInput.fill(partyName);
  await page.keyboard.press("Enter");
  const customerDialog = page.getByRole("dialog");
  await expect(customerDialog.getByRole("heading", { name: "Create customer" })).toBeVisible();
  await customerDialog.getByRole("button", { name: "Save" }).click();
  await expect(customerDialog).toBeHidden();
  await expect(customerInput).toHaveValue(partyName);

  const saleProduct = page.getByRole("textbox", { name: "Product name / SKU", exact: true }).first();
  await saleProduct.fill("basin ceramic");
  await page.keyboard.press("Enter");
  const saleQuantity = page.getByLabel("Qty", { exact: true }).first();
  await expect(saleQuantity).toBeFocused();
  await saleQuantity.fill("1");
  await saleQuantity.press("Enter");
  const saleDiscount = page.getByLabel("Disc. %", { exact: true }).first();
  await expect(saleDiscount).toBeFocused();
  await saleDiscount.fill("5");
  await saleDiscount.press("Enter");
  const saleItem = page.locator("fieldset").filter({ hasText: "Item 1" }).first();
  const saleGst = saleItem.locator("select").first();
  await expect(saleGst).toBeFocused();
  await saleGst.selectOption("18");
  await saleGst.press("Enter");
  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  const postBillButton = page.getByRole("button", { name: "Post bill", exact: true });
  await expect(postBillButton).toBeEnabled();
  await postBillButton.click();
  await expect(page.getByText("After issue")).toBeVisible();

  await page.goto("/admin/hardware/purchases/new");
  const supplierInput = page.getByRole("textbox", { name: "Supplier", exact: true });
  await supplierInput.fill(partyName);
  await page.keyboard.press("Enter");
  await expect(supplierInput).toHaveValue(partyName);
  await expect(page.locator('input[name="partyId"]')).toHaveValue(/.+/);
  await page.getByLabel("Supplier invoice / reference", { exact: true }).fill(`E2E-PURCHASE-${runSuffix}`);
  const purchaseProduct = page.getByRole("textbox", { name: "Product", exact: true }).first();
  await purchaseProduct.fill("cement portland 50");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save purchase" }).click();
  await page.waitForURL(/\/admin\/hardware\/purchases\?created=1/);

  await page.goto("/admin/hardware/purchases/new");
  const existingSupplier = page.getByRole("textbox", { name: "Supplier", exact: true });
  await existingSupplier.fill(partyName);
  const existingSupplierOption = page.getByRole("button", { name: partyName, exact: true });
  await expect(existingSupplierOption).toBeVisible();
  await existingSupplierOption.click();
  await expect(existingSupplier).toHaveValue(partyName);
  await expect(page.locator('input[name="partyId"]')).toHaveValue(/.+/);

  await page.goto("/admin/hardware/quotations/new");
  const estimateCustomer = page.getByRole("textbox", { name: "Customer", exact: true });
  await estimateCustomer.fill(partyName);
  await page.keyboard.press("Enter");
  await page.getByLabel("Customer reference", { exact: true }).fill(`E2E-ESTIMATE-${runSuffix}`);
  const estimateProduct = page.getByRole("textbox", { name: "Product", exact: true }).first();
  await estimateProduct.fill("basin ceramic");
  await page.keyboard.press("Enter");
  const estimateQuantity = page.getByLabel("Qty", { exact: true }).first();
  await expect(estimateQuantity).toBeFocused();
  await estimateQuantity.press("Enter");
  const estimateDiscount = page.getByLabel("Disc. %", { exact: true }).first();
  await expect(estimateDiscount).toBeFocused();
  await expect(estimateDiscount).toHaveValue("5");
  await estimateDiscount.fill("3");
  await estimateDiscount.press("Enter");
  const estimateItem = page.locator("fieldset").filter({ hasText: "Item 1" }).first();
  const estimateGst = estimateItem.locator("select").first();
  await expect(estimateGst).toBeFocused();
  await expect(estimateGst).toHaveValue("18");
  await estimateGst.selectOption("12");
  await estimateGst.press("Enter");
  await expect(page.getByText("Item 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Automatic round-off", { exact: true })).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Save and print Estimate Bill" }).click();
  await page.waitForURL(/\/admin\/hardware\/print\//);
  await expect(page.getByText(/Estimate Bill/i).first()).toBeVisible();

  const [printPopup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByTestId("isolated-print-button").click(),
  ]);
  await expect(printPopup.locator("body > .print-sheet")).toHaveCount(1);
  await expect(printPopup.locator(NON_PRINT_SELECTOR)).toHaveCount(0);
  expect(await printPopup.locator("body").evaluate((body) => body.children.length)).toBe(1);
  const printStyles = (await printPopup.locator("style").allTextContents()).join("\n");
  expect(printStyles).toContain("@page { size: A4 portrait; margin: 5mm 6mm; }");
  expect(printStyles).toContain(".bill-items-table");
  await expect(printPopup.locator(".bill-page")).toHaveCount(1);
  await expect(printPopup.locator(".bill-page")).toHaveCSS("display", "flex");
  await expect(printPopup.locator(".bill-page")).toHaveCSS("border-top-style", "solid");
  await expect(printPopup.locator(".bill-header-top")).toHaveCSS("display", "grid");
  await expect(printPopup.locator(".bill-items-table")).toHaveCSS("table-layout", "fixed");
  await expect(printPopup.locator(".bill-description").first()).toHaveCSS("white-space", "normal");
  await expect(printPopup.getByText("Pending", { exact: true })).toHaveCount(0);
  await expect(printPopup.getByText("Status", { exact: true })).toHaveCount(0);
  await expect(printPopup.getByText(/Confirmed - deducted/i)).toHaveCount(0);
  await expect(printPopup.locator(".bill-tax-summary-line")).toContainText("Taxable Value @12%");
  await expect(printPopup.locator(".bill-words")).toContainText(/^Rupees .+ Only$/);
  await expect.poll(() => printPopup.locator("html").getAttribute("data-print-ready")).toBe("true");
  await expect.poll(() => printPopup.locator("html").getAttribute("data-print-invoked")).toBe("true");
  await expect.poll(() => printPopup.locator("html").getAttribute("data-native-print-called")).toBe("true");
  await printPopup.close();

  const documentId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
  expect(documentId).toBeTruthy();
  await page.goto(`/admin/hardware/quotations/${documentId}/edit`);
  await expect(page.getByRole("heading", { name: /Edit HSQ-/, level: 1 })).toBeVisible();
  await page.getByLabel("Qty", { exact: true }).first().fill("2");
  await page.getByRole("button", { name: "Update and print Estimate Bill" }).click();
  await page.waitForURL(new RegExp(`/admin/hardware/print/${documentId}`));
  await expect(page.getByText(/Estimate Bill/i).first()).toBeVisible();

  await page.goto("/admin/hardware/sales/new");
  const rememberedProduct = page.getByRole("textbox", { name: "Product name / SKU", exact: true }).first();
  await rememberedProduct.fill("basin ceramic");
  await page.keyboard.press("Enter");
  const rememberedQuantity = page.getByLabel("Qty", { exact: true }).first();
  await expect(rememberedQuantity).toBeFocused();
  await rememberedQuantity.press("Enter");
  const rememberedDiscount = page.getByLabel("Disc. %", { exact: true }).first();
  await expect(rememberedDiscount).toBeFocused();
  await expect(rememberedDiscount).toHaveValue("3");
  await rememberedDiscount.press("Enter");
  const rememberedItem = page.locator("fieldset").filter({ hasText: "Item 1" }).first();
  const rememberedGst = rememberedItem.locator("select").first();
  await expect(rememberedGst).toBeFocused();
  await expect(rememberedGst).toHaveValue("12");
});

const NON_PRINT_SELECTOR = ".no-print";
