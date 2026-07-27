import {
  loadDeployConfig,
  runSsh,
  shellQuote,
  validateDeployConfig,
} from "./vps-utils.mjs";

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
  const smokeIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const submitResponse = await fetch(`${baseUrl}/api/public/intake/manglam-trading-demo`, {
    body: JSON.stringify(buildPayload(businessName)),
    headers: { "content-type": "application/json", "x-forwarded-for": smokeIp },
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
    redirect: "manual",
  });
  const adminHtml = await adminResponse.text();
  if (adminResponse.status === 200 && adminHtml.includes(submitPayload.submissionNumber)) {
    console.log(`Admin intake queue page verified ${submitPayload.submissionNumber}.`);
  } else if (isRedirectOrLocked(adminResponse.status)) {
    verifyPrivateQueueRecord(submitPayload.submissionNumber, businessName);
    console.log(`Private admin queue record verified ${submitPayload.submissionNumber}; public admin route stayed locked with ${adminResponse.status}.`);
  } else {
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

function verifyPrivateQueueRecord(submissionNumber, businessName) {
  let config;
  try {
    config = loadDeployConfig();
    validateDeployConfig(config);
  } catch {
    throw new Error(`Admin intake queue is locked and no verified VPS deploy config is available to check ${submissionNumber}.`);
  }

  const remote = `
set -euo pipefail
cd ${shellQuote(config.DEPLOY_APP_DIR)}
set -a
. ${shellQuote(config.DEPLOY_ENV_FILE)}
set +a
SMOKE_SUBMISSION_NUMBER=${shellQuote(submissionNumber)} SMOKE_BUSINESS_NAME=${shellQuote(businessName)} node --input-type=module <<'NODE'
import prismaClientPackage from "./packages/database/node_modules/@prisma/client/default.js";

const { PrismaClient } = prismaClientPackage;
const prisma = new PrismaClient();
try {
  const record = await prisma.requirement.findFirst({
    include: { client: { select: { slug: true } } },
    where: {
      metadata: {
        path: ["submissionNumber"],
        equals: process.env.SMOKE_SUBMISSION_NUMBER,
      },
    },
  });

  if (!record) {
    throw new Error("missing");
  }

  const data = record.submittedData && typeof record.submittedData === "object" ? record.submittedData : {};
  const company = data.company && typeof data.company === "object" ? data.company : {};
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  if (company.firmName !== process.env.SMOKE_BUSINESS_NAME) {
    throw new Error("business-name-mismatch");
  }
  if (record.client?.slug !== "manglam-trading-demo" || metadata.source !== "public-intake") {
    throw new Error("queue-metadata-mismatch");
  }

  console.log("PRIVATE_QUEUE_VERIFIED");
} finally {
  await prisma.$disconnect();
}
NODE
`;
  const result = runSsh(config, `bash -lc ${shellQuote(remote)}`);
  if (result.status !== 0 || !result.stdout.includes("PRIVATE_QUEUE_VERIFIED")) {
    throw new Error(`Private admin queue verification failed for ${submissionNumber}.`);
  }
}

function isRedirectOrLocked(status) {
  return [301, 302, 303, 307, 308, 401, 403, 404].includes(status);
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
