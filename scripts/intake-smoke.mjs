const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://45.10.21.141:3010").replace(/\/$/, "");

const markers = [
  "Manglam Trading Company",
  "Software Requirement Form",
  "Business Details",
  "Product/Catalog Details",
  "Stock Details",
  "Supplier/Customer Details",
  "Billing Details",
  "Submit",
];

const protectedRoutes = [
  "/admin",
  "/admin/hardware/demo",
  "/admin/billing",
  "/admin/release-checklist",
  "/client/requirements/new",
  "/master",
  "/api/requirements",
  "/api/admin/test",
  "/api/client/test",
  "/api/master/test",
];

async function main() {
  const intakeResponse = await fetch(`${baseUrl}/intake/manglam-trading-demo`, {
    redirect: "manual",
  });
  const html = await intakeResponse.text();

  if (intakeResponse.status !== 200) {
    throw new Error(`Intake page expected 200, received ${intakeResponse.status}.`);
  }

  for (const marker of markers) {
    if (!html.includes(marker)) {
      throw new Error(`Intake page is missing marker: ${marker}`);
    }
  }

  if (html.includes('aria-label="Loading"')) {
    throw new Error("Intake page still includes the global loading spinner marker.");
  }

  for (const route of protectedRoutes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    if (![301, 302, 303, 307, 308, 401, 403, 404].includes(response.status)) {
      throw new Error(`Protected route ${route} returned public status ${response.status}.`);
    }
  }

  console.log(`Public intake smoke passed for ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
