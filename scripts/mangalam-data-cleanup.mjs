import { createRequire } from "node:module";
import fs from "node:fs";

const requireFromDatabase = createRequire(new URL("../packages/database/package.json", import.meta.url));
const { PrismaClient } = requireFromDatabase("@prisma/client");
const prisma = new PrismaClient();

const tenantSlug = "manglam-trading-demo";
const realSubmissionNumber = "PUB-REQ-2026-0015";
const seedMarker = "manglam_demo_seed";
const apply = process.argv.includes("--apply");
const reportArg = process.argv.find((argument) => argument.startsWith("--report="));
const backupArg = process.argv.find((argument) => argument.startsWith("--backup-dir="));
const reportPath = reportArg?.slice("--report=".length);
const backupDir = backupArg?.slice("--backup-dir=".length);

try {
  assertSafeDatabaseUrl(process.env.DATABASE_URL);
  if (apply) assertBackup(backupDir);

  const tenant = await prisma.tenant.findUnique({
    include: { hardwareBusinessSettings: true },
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error("Mangalam tenant was not found.");
  assertOfficialIdentity(tenant);

  const inventory = await loadInventory(tenant.id);
  const classification = classifyInventory(inventory);
  assertPreservationGates(classification);

  const countsBefore = await counts(tenant.id);
  let deleted = emptyDeletionCounts();

  if (apply) {
    deleted = await applyCleanup(tenant, classification);
    const countsAfter = await counts(tenant.id);
    await verifyAfterCleanup(tenant.id, classification);
    classification.result = { countsAfter, countsBefore, deleted };
  } else {
    classification.result = { countsBefore, deleted, mode: "DRY_RUN" };
  }

  const output = {
    backupDir: apply ? backupDir : null,
    classification,
    generatedAt: new Date().toISOString(),
    mode: apply ? "APPLY" : "DRY_RUN",
    tenantSlug,
  };
  if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Mangalam cleanup ${apply ? "apply" : "dry run"} completed.`);
  console.log(`Real submission preserved: ${realSubmissionNumber}`);
  console.log(`Products selected: ${classification.deleteDemo.products.length}`);
  console.log(`Movements selected: ${classification.deleteDemo.movements.length}`);
  console.log(`Parties selected: ${classification.deleteDemo.clients.length}`);
  console.log(`Trade documents selected: ${classification.deleteDemo.tradeDocuments.length}`);
  console.log(`Smoke requirements selected: ${classification.deleteSmokeTest.requirements.length}`);
  console.log(`Review-required records retained: ${classification.reviewRequired.length}`);
  console.log("CafeLuxe untouched: yes");
} finally {
  await prisma.$disconnect();
}

async function loadInventory(tenantId) {
  const [
    products,
    movements,
    clients,
    tradeDocuments,
    invoices,
    payments,
    requirements,
    categories,
    brands,
    units,
    locations,
    timelineEvents,
  ] = await Promise.all([
    prisma.hardwareProduct.findMany({ where: { tenantId } }),
    prisma.hardwareInventoryMovement.findMany({ where: { tenantId } }),
    prisma.clientOrganization.findMany({ where: { tenantId } }),
    prisma.hardwareTradeDocument.findMany({ include: { items: true }, where: { tenantId } }),
    prisma.invoice.findMany({ where: { tenantId } }),
    prisma.paymentRecord.findMany({ where: { tenantId } }),
    prisma.requirement.findMany({ where: { tenantId } }),
    prisma.hardwareProductCategory.findMany({ include: { products: { select: { id: true } } }, where: { tenantId } }),
    prisma.hardwareBrand.findMany({ include: { products: { select: { id: true } } }, where: { tenantId } }),
    prisma.hardwareUnit.findMany({ include: { products: { select: { id: true } } }, where: { tenantId } }),
    prisma.hardwareStockLocation.findMany({ include: { movements: { select: { id: true } } }, where: { tenantId } }),
    prisma.hardwareTimelineEvent.findMany({ where: { tenantId } }),
  ]);
  return {
    brands,
    categories,
    clients,
    invoices,
    locations,
    movements,
    payments,
    products,
    requirements,
    timelineEvents,
    tradeDocuments,
    units,
  };
}

function classifyInventory(inventory) {
  const demoProducts = inventory.products.filter((record) => isDemoJson(record.metadata));
  const demoProductIds = new Set(demoProducts.map((record) => record.id));
  const demoClients = inventory.clients.filter(
    (record) =>
      record.slug !== tenantSlug &&
      (isDemoJson(record.metadata) || isKnownDemoParty(record.slug)),
  );
  const demoClientIds = new Set(demoClients.map((record) => record.id));

  const demoMovements = inventory.movements.filter(
    (record) =>
      record.referenceType === seedMarker ||
      isDemoJson(record.metadata) ||
      demoProductIds.has(record.productId),
  );
  const demoMovementIds = new Set(demoMovements.map((record) => record.id));

  const demoTradeDocuments = inventory.tradeDocuments.filter((record) => {
    if (isDemoJson(record.metadata) || isKnownSeedDocument(record.documentNumber)) return true;
    if (record.requirementId || record.projectId || record.items.length === 0) return false;
    const onlyDemoItems = record.items.every((item) => demoProductIds.has(item.productId));
    const demoCustomer = !record.customerId || demoClientIds.has(record.customerId);
    const demoSupplier = !record.supplierId || demoClientIds.has(record.supplierId);
    return onlyDemoItems && demoCustomer && demoSupplier;
  });
  const demoTradeDocumentIds = new Set(demoTradeDocuments.map((record) => record.id));

  const demoInvoices = inventory.invoices.filter((record) => {
    const metadata = asRecord(record.metadata);
    return (
      typeof metadata.hardwareTradeDocumentId === "string" &&
      demoTradeDocumentIds.has(metadata.hardwareTradeDocumentId)
    );
  });
  const demoInvoiceIds = new Set(demoInvoices.map((record) => record.id));
  const demoPayments = inventory.payments.filter((record) => demoInvoiceIds.has(record.invoiceId));

  const smokeRequirements = inventory.requirements.filter((record) => {
    const metadata = asRecord(record.metadata);
    if (metadata.submissionNumber === realSubmissionNumber) return false;
    if (metadata.source !== "public-intake") return false;
    const submittedData = asRecord(record.submittedData);
    const company = asRecord(submittedData.company);
    const firmName = typeof company.firmName === "string" ? company.firmName : "";
    return /\b(smoke|test)\b/i.test(`${firmName} ${record.title}`);
  });

  const realRequirements = inventory.requirements.filter(
    (record) => asRecord(record.metadata).submissionNumber === realSubmissionNumber,
  );
  const reviewedRequirementIds = new Set([
    ...smokeRequirements.map((record) => record.id),
    ...realRequirements.map((record) => record.id),
  ]);
  const reviewRequirements = inventory.requirements.filter(
    (record) =>
      asRecord(record.metadata).source === "public-intake" &&
      !reviewedRequirementIds.has(record.id),
  );

  const demoTimelineEvents = inventory.timelineEvents.filter(
    (record) => (record.productId && demoProductIds.has(record.productId)) || isDemoJson(record.metadata),
  );
  const demoCategories = inventory.categories.filter(
    (record) =>
      isDemoJson(record.metadata) &&
      record.products.every((product) => demoProductIds.has(product.id)),
  );
  const demoBrands = inventory.brands.filter(
    (record) =>
      isDemoJson(record.metadata) &&
      record.products.every((product) => demoProductIds.has(product.id)),
  );
  const demoUnits = inventory.units.filter(
    (record) =>
      isKnownDemoUnit(record.code) &&
      record.products.every((product) => demoProductIds.has(product.id)),
  );
  const demoLocations = inventory.locations.filter(
    (record) =>
      isDemoJson(record.metadata) &&
      record.movements.every((movement) => demoMovementIds.has(movement.id)),
  );

  return {
    deleteDemo: {
      brands: summarize(demoBrands, "name"),
      categories: summarize(demoCategories, "name"),
      clients: summarize(demoClients, "name"),
      invoices: summarize(demoInvoices, "invoiceNumber"),
      locations: summarize(demoLocations, "name"),
      movements: summarize(demoMovements, "referenceType"),
      payments: summarize(demoPayments, "reference"),
      products: summarize(demoProducts, "sku"),
      timelineEvents: summarize(demoTimelineEvents, "summary"),
      tradeDocuments: summarize(demoTradeDocuments, "documentNumber"),
      units: summarize(demoUnits, "code"),
    },
    deleteSmokeTest: {
      requirements: smokeRequirements.map((record) => ({
        id: record.id,
        label: String(asRecord(record.metadata).submissionNumber ?? record.title),
      })),
    },
    keepReal: {
      officialIdentity: true,
      requirements: realRequirements.map((record) => ({
        id: record.id,
        label: realSubmissionNumber,
      })),
      sourceDocuments: true,
    },
    keepSystem: ["tenant", "membership", "roles", "permissions", "migrations", "runtime configuration"],
    reviewRequired: reviewRequirements.map((record) => ({
      id: record.id,
      label: String(asRecord(record.metadata).submissionNumber ?? record.title),
      type: "public-intake",
    })),
  };
}

async function applyCleanup(tenant, classification) {
  const ids = toIdSets(classification);
  const currentBranding = asRecord(tenant.branding);
  const currentSettings = asRecord(tenant.settings);
  const cleanedBranding = withoutKeys(currentBranding, ["demoPack", "logoPlaceholder"]);
  const cleanedSettings = withoutKeys(currentSettings, ["demoProfile", "hardware", "releaseChecklistRoute"]);

  return prisma.$transaction(async (tx) => {
    const payments = await tx.paymentRecord.deleteMany({ where: { id: { in: ids.payments } } });
    const invoices = await tx.invoice.deleteMany({ where: { id: { in: ids.invoices } } });
    const tradeDocuments = await tx.hardwareTradeDocument.deleteMany({
      where: { id: { in: ids.tradeDocuments } },
    });
    const movements = await tx.hardwareInventoryMovement.deleteMany({
      where: { id: { in: ids.movements } },
    });
    const timelineEvents = await tx.hardwareTimelineEvent.deleteMany({
      where: { id: { in: ids.timelineEvents } },
    });
    const products = await tx.hardwareProduct.deleteMany({ where: { id: { in: ids.products } } });

    if (tenant.hardwareBusinessSettings) {
      await tx.hardwareBusinessSettings.update({
        data: {
          defaultGstMode: "none",
          defaultStockLocationId: null,
          email: null,
          financialYear: "PENDING",
          invoicePrefix: "PENDING",
          phone: null,
          roundOffEnabled: false,
          termsFooter: null,
        },
        where: { tenantId: tenant.id },
      });
    }

    const locations = await tx.hardwareStockLocation.deleteMany({
      where: { id: { in: ids.locations } },
    });
    const categories = await tx.hardwareProductCategory.deleteMany({
      where: { id: { in: ids.categories } },
    });
    const brands = await tx.hardwareBrand.deleteMany({ where: { id: { in: ids.brands } } });
    const units = await tx.hardwareUnit.deleteMany({ where: { id: { in: ids.units } } });
    const clients = await tx.clientOrganization.deleteMany({ where: { id: { in: ids.clients } } });
    const requirements = await tx.requirement.deleteMany({
      where: { id: { in: ids.smokeRequirements } },
    });

    await tx.tenant.update({
      data: {
        branding: cleanedBranding,
        primaryDomain: "mangalamsanitary.in",
        settings: {
          ...cleanedSettings,
          cleanupStatus: {
            obsoleteDemoDataRemoved: true,
            sourceBackupRequired: true,
          },
        },
      },
      where: { id: tenant.id },
    });

    return {
      brands: brands.count,
      categories: categories.count,
      clients: clients.count,
      invoices: invoices.count,
      locations: locations.count,
      movements: movements.count,
      payments: payments.count,
      products: products.count,
      requirements: requirements.count,
      timelineEvents: timelineEvents.count,
      tradeDocuments: tradeDocuments.count,
      units: units.count,
    };
  });
}

async function verifyAfterCleanup(tenantId, classification) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant disappeared during cleanup.");
  assertOfficialIdentity(tenant);

  const real = await prisma.requirement.findFirst({
    where: {
      metadata: { path: ["submissionNumber"], equals: realSubmissionNumber },
      tenantId,
    },
  });
  if (!real) throw new Error(`${realSubmissionNumber} was not preserved.`);

  const ids = toIdSets(classification);
  const remainingCandidates = await Promise.all([
    prisma.hardwareProduct.count({ where: { id: { in: ids.products } } }),
    prisma.hardwareInventoryMovement.count({ where: { id: { in: ids.movements } } }),
    prisma.clientOrganization.count({ where: { id: { in: ids.clients } } }),
    prisma.hardwareTradeDocument.count({ where: { id: { in: ids.tradeDocuments } } }),
    prisma.requirement.count({ where: { id: { in: ids.smokeRequirements } } }),
  ]);
  if (remainingCandidates.some(Boolean)) throw new Error("One or more approved cleanup candidates remain.");
}

async function counts(tenantId) {
  const [products, movements, clients, tradeDocuments, requirements, invoices, payments] =
    await Promise.all([
      prisma.hardwareProduct.count({ where: { tenantId } }),
      prisma.hardwareInventoryMovement.count({ where: { tenantId } }),
      prisma.clientOrganization.count({ where: { tenantId } }),
      prisma.hardwareTradeDocument.count({ where: { tenantId } }),
      prisma.requirement.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.paymentRecord.count({ where: { tenantId } }),
    ]);
  return { clients, invoices, movements, payments, products, requirements, tradeDocuments };
}

function assertPreservationGates(classification) {
  if (classification.keepReal.requirements.length !== 1) {
    throw new Error(`Expected exactly one ${realSubmissionNumber} requirement before cleanup.`);
  }
  if (!classification.keepReal.officialIdentity || !classification.keepReal.sourceDocuments) {
    throw new Error("Official identity and source-document preservation gates must be active.");
  }
}

function assertOfficialIdentity(tenant) {
  const branding = asRecord(tenant.branding);
  const identity = asRecord(branding.officialIdentity);
  if (
    branding.displayName !== "MANGALAM SANITARY" ||
    identity.status !== "LOCKED" ||
    identity.gstin !== "08EFPK7672A1ZT" ||
    identity.legalName !== "KRISHAN KUMAR"
  ) {
    throw new Error("Official Mangalam identity lock is missing or inconsistent.");
  }
}

function assertSafeDatabaseUrl(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const lower = databaseUrl.toLowerCase();
  if (
    (!lower.includes("127.0.0.1") && !lower.includes("localhost")) ||
    !lower.includes("trustfirst_demo") ||
    /\b(prod|production|live)\b/.test(lower)
  ) {
    throw new Error("Cleanup is restricted to the isolated local trustfirst_demo database.");
  }
}

function assertBackup(value) {
  if (!value || !/^\/var\/backups\/trustfirst-client-portal\/\d{8}T\d{6}Z$/.test(value)) {
    throw new Error("--backup-dir must identify a timestamped TrustFirst-only backup.");
  }
  for (const filename of ["trustfirst_demo.dump", "tenant-assets.tgz", "SHA256SUMS"]) {
    if (!fs.existsSync(`${value}/${filename}`)) throw new Error(`Backup evidence is missing ${filename}.`);
  }
}

function toIdSets(classification) {
  return {
    brands: ids(classification.deleteDemo.brands),
    categories: ids(classification.deleteDemo.categories),
    clients: ids(classification.deleteDemo.clients),
    invoices: ids(classification.deleteDemo.invoices),
    locations: ids(classification.deleteDemo.locations),
    movements: ids(classification.deleteDemo.movements),
    payments: ids(classification.deleteDemo.payments),
    products: ids(classification.deleteDemo.products),
    smokeRequirements: ids(classification.deleteSmokeTest.requirements),
    timelineEvents: ids(classification.deleteDemo.timelineEvents),
    tradeDocuments: ids(classification.deleteDemo.tradeDocuments),
    units: ids(classification.deleteDemo.units),
  };
}

function ids(records) {
  return records.map((record) => record.id);
}

function summarize(records, labelKey) {
  return records.map((record) => ({
    id: record.id,
    label: String(record[labelKey] ?? record.id),
  }));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isDemoJson(value) {
  const record = asRecord(value);
  return (
    record.seedProfile === seedMarker ||
    record.seedProfile === "manglam-demo" ||
    record.importTemplate === "manglam-demo"
  );
}

function isKnownDemoParty(slug) {
  return new Set([
    "sample-walk-in-customer",
    "sample-contractor-account",
    "sample-project-buyer",
    "sample-pipe-supplier",
    "sample-sanitary-supplier",
    "sample-building-material-supplier",
  ]).has(slug);
}

function isKnownSeedDocument(documentNumber) {
  return new Set([
    "MTC-QUO-2026-0001",
    "MTC-SALE-2026-0001",
    "MTC-PUR-2026-0001",
  ]).has(documentNumber);
}

function isKnownDemoUnit(code) {
  return new Set(["PCS", "BOX", "BAG", "KG", "MTR"]).has(code);
}

function withoutKeys(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function emptyDeletionCounts() {
  return {
    brands: 0,
    categories: 0,
    clients: 0,
    invoices: 0,
    locations: 0,
    movements: 0,
    payments: 0,
    products: 0,
    requirements: 0,
    timelineEvents: 0,
    tradeDocuments: 0,
    units: 0,
  };
}
