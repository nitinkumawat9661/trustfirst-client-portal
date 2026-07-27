const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://45.10.21.141:3010").replace(/\/$/, "");

const markers = [
  "MANGALAM SANITARY",
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

  const businessName = `Manglam Intake Smoke ${new Date().toISOString()}`;
  const submitResponse = await fetch(`${baseUrl}/api/public/intake/manglam-trading-demo`, {
    body: JSON.stringify(buildPayload(businessName)),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const submitPayload = await submitResponse.json();

  if (submitResponse.status !== 201 || !submitPayload.submissionNumber) {
    throw new Error(`Intake submit expected 201 with submissionNumber, received ${submitResponse.status}.`);
  }

  const thankYouResponse = await fetch(
    `${baseUrl}/intake/manglam-trading-demo/thank-you?submission=${encodeURIComponent(submitPayload.submissionNumber)}`,
  );
  const thankYouHtml = await thankYouResponse.text();
  if (thankYouResponse.status !== 200) {
    throw new Error(`Thank-you page expected 200, received ${thankYouResponse.status}.`);
  }
  for (const marker of [
    submitPayload.submissionNumber,
    businessName,
    "Your details have been received by Mangalam Sanitary.",
    "Please send this Submission ID to Mangalam Sanitary on WhatsApp.",
  ]) {
    if (!thankYouHtml.includes(marker)) {
      throw new Error(`Thank-you page missing marker: ${marker}`);
    }
  }

  const adminResponse = await fetch(`${baseUrl}/admin/requirements/intake`, {
    headers: { "x-trustfirst-internal-qa": "yes" },
  });
  const adminHtml = await adminResponse.text();
  if (adminResponse.status !== 200 || !adminHtml.includes(submitPayload.submissionNumber)) {
    throw new Error(`Admin intake queue did not show submission ${submitPayload.submissionNumber}.`);
  }

  const publicReadResponse = await fetch(`${baseUrl}/api/public/intake/manglam-trading-demo`, {
    redirect: "manual",
  });
  if (![404, 405].includes(publicReadResponse.status)) {
    throw new Error(`Public intake read/list endpoint returned ${publicReadResponse.status}.`);
  }

  for (const route of protectedRoutes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    if (![301, 302, 303, 307, 308, 401, 403, 404].includes(response.status)) {
      throw new Error(`Protected route ${route} returned public status ${response.status}.`);
    }
  }

  console.log(`Public intake smoke passed for ${baseUrl}: ${submitPayload.submissionNumber}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

function buildPayload(businessName) {
  return {
    access: {
      languagePreference: "both",
      offlineNeed: "Smoke test offline queue note",
      rolesNeeded: ["Owner"],
    },
    business: {
      address: "Smoke test market road",
      businessType: "Hardware and sanitary trading",
      countersOrBranches: "Main counter",
      gstin: "GSTIN placeholder",
      teamSize: "5 users",
    },
    catalog: {
      barcodeUsage: "Barcode search",
      brandHandling: "Brand wise catalog",
      productCategories: ["Pipes"],
      skuNeeds: "SKU lookup",
      unitTypes: ["Piece"],
    },
    company: {
      contactName: "Smoke Test Owner",
      email: "smoke@example.com",
      firmName: businessName,
      phone: `90000${String(Date.now()).slice(-5)}`,
      role: "Owner",
    },
    inventory: {
      godowns: "Main godown",
      lowStockAlerts: "Low stock alert",
      openingStockReadiness: "Opening stock ready",
      stockAdjustmentNeeds: "Adjustment entries",
      stockTracking: "Product stock tracking",
    },
    notes: {
      currentSoftware: "Spreadsheet",
      painPoints: "Smoke test verifies backend persistence before confirmation.",
      successCriteria: "Thank-you page and admin queue show the same submission ID.",
      targetDemoDate: "Sprint 39",
    },
    payments: {
      creditTerms: "Basic credit",
      outstandingTracking: "Customer outstanding",
      paymentModes: ["Cash"],
    },
    purchase: {
      purchaseEntryNeeds: "Purchase stock entry",
      supplierManagement: "Supplier list",
      supplierPayments: "Supplier outstanding later",
    },
    reports: {
      dashboardNeeds: "Owner dashboard",
      exportNeeds: "CSV export",
      requiredReports: ["Daily sales"],
    },
    sales: {
      billingFlow: "Sale invoice",
      discountNeeds: "Item discount",
      gstBilling: "GST summary",
      printFormat: "A4",
      quotationFlow: "Quotation to sale",
    },
  };
}
