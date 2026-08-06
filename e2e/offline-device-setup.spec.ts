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

  const enrollmentResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/offline/devices/enroll") && response.request().method() === "POST",
  );
  const leaseResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/offline/leases/reserve") && response.request().method() === "POST",
  );
  const snapshotResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/offline/snapshot") && response.request().method() === "GET",
  );

  await page.getByRole("button", { name: "Setup offline device", exact: true }).click();

  const [enrollmentResponse, leaseResponse, snapshotResponse] = await Promise.all([
    enrollmentResponsePromise,
    leaseResponsePromise,
    snapshotResponsePromise,
  ]);
  expect(enrollmentResponse.status()).toBe(201);
  expect(leaseResponse.status()).toBe(200);
  expect(snapshotResponse.status()).toBe(200);

  const enrollmentPayload = await enrollmentResponse.json() as {
    data?: { deviceId?: string; tenantId?: string; userId?: string };
    ok?: boolean;
  };
  const leasePayload = await leaseResponse.json() as { data?: unknown[]; ok?: boolean };
  const snapshotPayload = await snapshotResponse.json() as {
    data?: { generatedAt?: string; schemaVersion?: number; tenantId?: string; userId?: string };
    ok?: boolean;
  };
  expect(enrollmentPayload.ok).toBe(true);
  expect(enrollmentPayload.data?.deviceId).toBeTruthy();
  expect(leasePayload.ok).toBe(true);
  expect(Array.isArray(leasePayload.data)).toBe(true);
  expect(snapshotPayload.ok).toBe(true);
  expect(snapshotPayload.data?.generatedAt).toBeTruthy();
  expect(snapshotPayload.data?.tenantId).toBe(enrollmentPayload.data?.tenantId);
  expect(snapshotPayload.data?.userId).toBe(enrollmentPayload.data?.userId);

  await expect(page.getByText(/Ready · \d+ products · \d+ parties · \d+ stock rows/)).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText("Unexpected offline setup error.", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Snapshot:/)).toBeVisible();
});
