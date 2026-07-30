import { expect, test } from "@playwright/test";

const adminEmail = process.env.MANGLAM_DEMO_ADMIN_EMAIL ?? "mangalam-staging-admin@trustfirst.example.com";
const adminPassword = process.env.MANGLAM_DEMO_ADMIN_PASSWORD ?? "MangalamStaging!2026";
const partyName = "E2E Dual Role Traders";

test("customer, supplier, sale, purchase and Estimate Bill work end to end", async ({ page }) => {
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
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Product name / SKU", exact: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Remove item 2" }).click();
  await page.getByRole("button", { name: "Post bill", exact: true }).click();
  await expect(page.getByText("After issue")).toBeVisible();

  await page.goto("/admin/hardware/purchases/new");
  const supplierInput = page.getByRole("textbox", { name: "Supplier", exact: true });
  await supplierInput.fill(partyName);
  await page.keyboard.press("Enter");
  await expect(supplierInput).toHaveValue(partyName);
  await page.getByLabel("Supplier invoice / reference", { exact: true }).fill("E2E-PURCHASE-001");
  const purchaseProduct = page.getByRole("textbox", { name: "Product", exact: true }).first();
  await purchaseProduct.fill("cement portland 50");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save purchase" }).click();
  await page.waitForURL(/\/admin\/hardware\/purchases\?created=1/);

  await page.goto("/admin/hardware/purchases/new");
  const existingSupplier = page.getByRole("textbox", { name: "Supplier", exact: true });
  await existingSupplier.fill(partyName);
  await expect(page.getByRole("button", { name: partyName, exact: true })).toBeVisible();
  await page.getByRole("button", { name: partyName, exact: true }).click();
  await expect(existingSupplier).toHaveValue(partyName);

  await page.goto("/admin/hardware/quotations/new");
  const estimateCustomer = page.getByRole("textbox", { name: "Customer", exact: true });
  await estimateCustomer.fill(partyName);
  await page.keyboard.press("Enter");
  await page.getByLabel("Customer reference", { exact: true }).fill("E2E-ESTIMATE-001");
  const estimateProduct = page.getByRole("textbox", { name: "Product", exact: true }).first();
  await estimateProduct.fill("bathrom towel ring");
  await page.keyboard.press("Enter");
  await page.getByLabel("GST %", { exact: true }).first().selectOption("18");
  await page.getByRole("button", { name: "Save and print Estimate Bill" }).click();
  await page.waitForURL(/\/admin\/hardware\/print\//);
  await expect(page.getByText("Estimate Bill", { exact: true }).first()).toBeVisible();

  const documentId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
  expect(documentId).toBeTruthy();
  await page.goto(`/admin/hardware/quotations/${documentId}/edit`);
  await expect(page.getByText(/Edit HSQ-/)).toBeVisible();
  await page.getByLabel("Qty", { exact: true }).first().fill("2");
  await page.getByRole("button", { name: "Update and print Estimate Bill" }).click();
  await page.waitForURL(new RegExp(`/admin/hardware/print/${documentId}`));
  await expect(page.getByText("Estimate Bill", { exact: true }).first()).toBeVisible();
});
