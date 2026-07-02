const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
const printDocumentId = process.env.SMOKE_PRINT_DOCUMENT_ID ?? "sample";

const checks = [
  { name: "auth route", path: "/api/auth/session", statuses: [200, 204, 302, 307, 308, 401] },
  { name: "manifest", path: "/manifest.webmanifest", statuses: [200] },
  { name: "offline page", path: "/offline", statuses: [200] },
  { name: "hardware demo page", path: "/admin/hardware/demo", statuses: [200, 302, 307, 308, 401, 403] },
  { name: "billing page", path: "/admin/billing", statuses: [200, 302, 307, 308, 401, 403] },
  { name: "hardware dashboard", path: "/admin/hardware/inventory", statuses: [200, 302, 307, 308, 401, 403] },
  { name: "print preview", path: `/admin/hardware/print/${encodeURIComponent(printDocumentId)}`, statuses: [200, 302, 307, 308, 401, 403, 404] },
];

const failures = [];

for (const check of checks) {
  const url = new URL(check.path, baseUrl).toString();
  try {
    const response = await fetch(url, { redirect: "manual" });
    const passed = check.statuses.includes(response.status);
    console.log(`${passed ? "PASS" : "FAIL"} ${check.name}: ${response.status} ${url}`);
    if (!passed) {
      failures.push(`${check.name} returned ${response.status}.`);
    }
  } catch (error) {
    failures.push(`${check.name} failed: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`FAIL ${check.name}: ${url}`);
  }
}

if (failures.length > 0) {
  console.error("Smoke tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Smoke tests passed.");
