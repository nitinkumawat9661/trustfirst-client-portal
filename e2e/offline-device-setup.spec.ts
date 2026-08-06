import { expect, test } from "@playwright/test";

const adminEmail = process.env.MANGLAM_DEMO_ADMIN_EMAIL ?? "mangalam-staging-admin@trustfirst.example.com";
const adminPassword = process.env.MANGLAM_DEMO_ADMIN_PASSWORD ?? "MangalamStaging!2026";

test("offline device enrollment reserves numbers and stores the tenant snapshot", async ({ page }) => {
  await page.goto("/sign-in?callbackUrl=/admin/hardware/sales/new");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await page.waitForURL(/\/admin\/hardware\/sales\/new/);

  await page.getByRole("button", { name: /Open offline sync panel/i }).click();

  const enrollmentResponse = page.waitForResponse((response) =>
    response.url().includes("/api/offline/devices/enroll") && response.request().method() === "POST",
  );
  const leaseResponse = page.waitForResponse((response) =>
    response.url().includes("/api/offline/leases/reserve") && response.request().method() === "POST",
  );
  const snapshotResponse = page.waitForResponse((response) =>
    response.url().includes("/api/offline/snapshot") && response.request().method() === "GET",
  );

  await page.getByRole("button", { name: "Setup offline device", exact: true }).click();

  await expect((await enrollmentResponse).status()).toBe(201);
  await expect((await leaseResponse).status()).toBe(200);
  await expect((await snapshotResponse).status()).toBe(200);
  await expect(page.getByText(/Ready · \d+ products · \d+ parties · \d+ stock rows/)).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText("Unexpected offline setup error.", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Snapshot:/)).toBeVisible();
});
