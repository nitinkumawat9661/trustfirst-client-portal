import argon2 from "argon2";
import { createRequire } from "node:module";
import { manglamProfile, manglamSeedData } from "./manglam-demo-profile.mjs";

const requireFromDatabaseWorkspace = createRequire(new URL("../packages/database/package.json", import.meta.url));
const prismaClientPackage = requireFromDatabaseWorkspace("@prisma/client");
const { PrismaClient } = prismaClientPackage;
const prisma = new PrismaClient();
const reset = process.argv.includes("--reset");
const demoPassword =
  process.env.MANGLAM_DEMO_ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "ManglamDemo!2026");

const permissions = [
  "*",
  "billing.read",
  "billing.manage",
  "billing.payments.manage",
  "hardware.catalog.read",
  "hardware.catalog.manage",
  "hardware.inventory.read",
  "hardware.inventory.manage",
  "hardware.plugin.manage",
  "hardware.purchase.read",
  "hardware.purchase.manage",
  "hardware.sales.read",
  "hardware.sales.manage",
  "hardware.settings.read",
  "hardware.settings.manage",
];

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!demoPassword) throw new Error("MANGLAM_DEMO_ADMIN_PASSWORD is required when NODE_ENV=production.");

  const role = await seedRole();
  const tenant = await seedTenant();
  const user = await seedAdminUser();
  await seedMembership(tenant.id, user.id, role.id);

  if (reset) {
    await resetDemoHardware(tenant.id);
  }

  await seedHardware(tenant.id);

  console.log("Manglam demo seed completed.");
  console.log(`Tenant: ${tenant.slug}`);
  console.log(`Admin: ${manglamProfile.adminEmail}`);
  if (!process.env.MANGLAM_DEMO_ADMIN_PASSWORD && process.env.NODE_ENV !== "production") {
    console.log("Default demo password used for local preview only.");
  }
} finally {
  await prisma.$disconnect();
}

async function seedRole() {
  const role = await prisma.role.upsert({
    create: {
      description: "Demo admin role for the hardware and sanitary configuration pack.",
      key: "manglam-demo-admin",
      name: "Manglam Demo Admin",
      system: true,
    },
    update: {},
    where: { key: "manglam-demo-admin" },
  });

  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      create: { key, name: key },
      update: {},
      where: { key },
    });
    await prisma.rolePermission.upsert({
      create: { permissionId: permission.id, roleId: role.id },
      update: {},
      where: { roleId_permissionId: { permissionId: permission.id, roleId: role.id } },
    });
  }

  return role;
}

async function seedTenant() {
  return prisma.tenant.upsert({
    create: {
      branding: {
        businessType: manglamProfile.businessType,
        demoPack: "manglam-trading",
        logoPlaceholder: "logo-placeholder",
      },
      name: manglamProfile.firmName,
      settings: tenantSettings(),
      slug: manglamProfile.tenantSlug,
      status: "ACTIVE",
    },
    update: {
      branding: {
        businessType: manglamProfile.businessType,
        demoPack: "manglam-trading",
        logoPlaceholder: "logo-placeholder",
      },
      name: manglamProfile.firmName,
      settings: tenantSettings(),
      status: "ACTIVE",
    },
    where: { slug: manglamProfile.tenantSlug },
  });
}

async function seedAdminUser() {
  const passwordHash = await argon2.hash(demoPassword, {
    memoryCost: 19456,
    parallelism: 1,
    timeCost: 3,
    type: argon2.argon2id,
  });
  return prisma.user.upsert({
    create: {
      email: manglamProfile.adminEmail,
      emailVerified: new Date(),
      name: manglamProfile.adminName,
      normalizedEmail: manglamProfile.adminEmail.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    update: {
      emailVerified: new Date(),
      name: manglamProfile.adminName,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    where: { normalizedEmail: manglamProfile.adminEmail.toLowerCase() },
  });
}

async function seedMembership(tenantId, userId, roleId) {
  return prisma.tenantMembership.upsert({
    create: {
      joinedAt: new Date(),
      roleId,
      status: "ACTIVE",
      tenantId,
      userId,
    },
    update: {
      roleId,
      status: "ACTIVE",
    },
    where: { tenantId_userId: { tenantId, userId } },
  });
}

async function seedHardware(tenantId) {
  const locationByCode = new Map();
  for (const locationInput of manglamSeedData.locations) {
    const location = await prisma.hardwareStockLocation.upsert({
      create: {
        address: {
          city: "Demo City",
          line1: `${locationInput.name} placeholder address`,
        },
        code: locationInput.code,
        metadata: { seedProfile: manglamProfile.seedMarker },
        name: locationInput.name,
        tenantId,
      },
      update: {
        metadata: { seedProfile: manglamProfile.seedMarker },
        name: locationInput.name,
      },
      where: { tenantId_code: { code: locationInput.code, tenantId } },
    });
    locationByCode.set(locationInput.code, location);
  }

  const defaultLocation = locationByCode.get(manglamProfile.defaultStockLocation.code);
  if (!defaultLocation) throw new Error("Default stock location was not seeded.");

  await prisma.hardwareBusinessSettings.upsert({
    create: {
      address: {
        city: "Demo City",
        line1: "Address placeholder for client demo",
        line2: "Replace with verified business address before production",
        state: "State placeholder",
      },
      defaultGstMode: manglamProfile.defaultGstMode,
      defaultStockLocationId: defaultLocation.id,
      email: manglamProfile.emailPlaceholder,
      financialYear: manglamProfile.defaultFinancialYear,
      firmName: manglamProfile.firmName,
      gstin: manglamProfile.gstinPlaceholder,
      invoicePrefix: manglamProfile.invoicePrefix,
      logoPlaceholder: "logo-placeholder",
      phone: manglamProfile.phonePlaceholder,
      roundOffEnabled: manglamProfile.defaultRoundOff,
      tenantId,
      termsFooter: "Demo terms and footer placeholder. Replace before production use.",
    },
    update: {
      defaultGstMode: manglamProfile.defaultGstMode,
      defaultStockLocationId: defaultLocation.id,
      email: manglamProfile.emailPlaceholder,
      financialYear: manglamProfile.defaultFinancialYear,
      firmName: manglamProfile.firmName,
      gstin: manglamProfile.gstinPlaceholder,
      invoicePrefix: manglamProfile.invoicePrefix,
      logoPlaceholder: "logo-placeholder",
      phone: manglamProfile.phonePlaceholder,
      roundOffEnabled: manglamProfile.defaultRoundOff,
      termsFooter: "Demo terms and footer placeholder. Replace before production use.",
    },
    where: { tenantId },
  });

  const categories = new Map();
  for (const name of manglamSeedData.categories) {
    const category = await prisma.hardwareProductCategory.upsert({
      create: { metadata: { seedProfile: manglamProfile.seedMarker }, name, slug: slugify(name), tenantId },
      update: { metadata: { seedProfile: manglamProfile.seedMarker }, name },
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
    categories.set(name, category);
  }

  const brands = new Map();
  for (const name of manglamSeedData.brands) {
    const brand = await prisma.hardwareBrand.upsert({
      create: { metadata: { seedProfile: manglamProfile.seedMarker }, name, slug: slugify(name), tenantId },
      update: { metadata: { seedProfile: manglamProfile.seedMarker }, name },
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
    brands.set(name, brand);
  }

  const units = new Map();
  for (const code of manglamSeedData.units) {
    const unit = await prisma.hardwareUnit.upsert({
      create: { code, name: code, tenantId },
      update: { name: code },
      where: { tenantId_code: { code, tenantId } },
    });
    units.set(code, unit);
  }

  const products = new Map();
  for (const sample of manglamSeedData.products) {
    const product = await prisma.hardwareProduct.upsert({
      create: productPayload(sample, tenantId, categories, brands, units),
      update: productPayload(sample, tenantId, categories, brands, units, true),
      where: { tenantId_sku: { sku: sample.sku, tenantId } },
    });
    products.set(sample.sku, product);

    const existingMovement = await prisma.hardwareInventoryMovement.findFirst({
      where: {
        locationId: defaultLocation.id,
        productId: product.id,
        referenceType: manglamProfile.seedMarker,
        tenantId,
      },
    });
    if (!existingMovement) {
      await prisma.hardwareInventoryMovement.create({
        data: {
          locationId: defaultLocation.id,
          metadata: { seedProfile: manglamProfile.seedMarker },
          notes: "Opening stock from demo configuration pack.",
          productId: product.id,
          quantity: sample.openingStock,
          referenceType: manglamProfile.seedMarker,
          tenantId,
          type: "STOCK_IN",
          unitCostCents: sample.purchaseCostCents,
        },
      });
    }
  }

  const clients = new Map();
  for (const name of [...manglamSeedData.customers, ...manglamSeedData.suppliers]) {
    const client = await prisma.clientOrganization.upsert({
      create: {
        customFields: { seedProfile: manglamProfile.seedMarker },
        industry: manglamProfile.businessType,
        lifecycleStage: "CLIENT",
        metadata: { seedProfile: manglamProfile.seedMarker },
        name,
        slug: slugify(name),
        status: "ACTIVE",
        tenantId,
      },
      update: {
        customFields: { seedProfile: manglamProfile.seedMarker },
        industry: manglamProfile.businessType,
        metadata: { seedProfile: manglamProfile.seedMarker },
        status: "ACTIVE",
      },
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
    clients.set(name, client);
  }

  await seedTradeDocuments(tenantId, products, clients);
}

async function seedTradeDocuments(tenantId, products, clients) {
  for (const sample of manglamSeedData.tradeDocuments) {
    const product = products.get(sample.productSku);
    if (!product) throw new Error(`Product ${sample.productSku} was not seeded.`);
    const customer = sample.customer ? clients.get(sample.customer) : null;
    const supplier = sample.supplier ? clients.get(sample.supplier) : null;
    const taxRateBps = taxRateBpsFromConfig(product.gstTaxConfig);
    const line = calculateLine(sample.quantity, sample.type === "PURCHASE_ENTRY" ? product.purchaseCostCents : product.salesPriceCents, taxRateBps);
    const existing = await prisma.hardwareTradeDocument.findFirst({
      where: { documentNumber: sample.documentNumber, tenantId },
    });
    if (existing) continue;

    await prisma.hardwareTradeDocument.create({
      data: {
        currency: "INR",
        customerId: customer?.id,
        discountCents: 0,
        documentNumber: sample.documentNumber,
        items: {
          create: [
            {
              description: product.name,
              discountCents: 0,
              lineTotalCents: line.lineTotalCents,
              metadata: { seedProfile: manglamProfile.seedMarker },
              productId: product.id,
              quantity: sample.quantity,
              taxCents: line.taxCents,
              taxRateBps,
              tenantId,
              unitAmountCents: line.unitAmountCents,
            },
          ],
        },
        metadata: { seedProfile: manglamProfile.seedMarker },
        roundOffCents: 0,
        status: "DRAFT",
        subtotalCents: line.subtotalCents,
        supplierId: supplier?.id,
        taxCents: line.taxCents,
        tenantId,
        timeline: {
          create: [
            {
              metadata: { seedProfile: manglamProfile.seedMarker },
              summary: `Seeded demo document ${sample.documentNumber}`,
              tenantId,
              verb: "CREATED",
            },
          ],
        },
        totalCents: line.lineTotalCents,
        type: sample.type,
      },
    });
  }
}

async function resetDemoHardware(tenantId) {
  const productSkus = manglamSeedData.products.map((product) => product.sku);
  const clientSlugs = [...manglamSeedData.customers, ...manglamSeedData.suppliers].map(slugify);
  const documentNumbers = manglamSeedData.tradeDocuments.map((document) => document.documentNumber);

  await prisma.$transaction([
    prisma.hardwareInventoryMovement.deleteMany({ where: { referenceType: manglamProfile.seedMarker, tenantId } }),
    prisma.hardwareTradeDocument.deleteMany({ where: { documentNumber: { in: documentNumbers }, tenantId } }),
    prisma.hardwareProduct.deleteMany({ where: { sku: { in: productSkus }, tenantId } }),
    prisma.hardwareProductCategory.deleteMany({ where: { slug: { in: manglamSeedData.categories.map(slugify) }, tenantId } }),
    prisma.hardwareBrand.deleteMany({ where: { slug: { in: manglamSeedData.brands.map(slugify) }, tenantId } }),
    prisma.hardwareUnit.deleteMany({ where: { code: { in: manglamSeedData.units }, tenantId } }),
    prisma.hardwareStockLocation.deleteMany({ where: { code: { in: manglamSeedData.locations.map((location) => location.code) }, tenantId } }),
    prisma.clientOrganization.deleteMany({ where: { slug: { in: clientSlugs }, tenantId } }),
  ]);
}

function productPayload(sample, tenantId, categories, brands, units, update = false) {
  const payload = {
    barcode: sample.barcode,
    brandId: brands.get(sample.brand)?.id ?? null,
    categoryId: categories.get(sample.category)?.id ?? null,
    description: `${sample.name} demo catalog item.`,
    gstTaxConfig: {
      mode: manglamProfile.defaultGstMode,
      rate: sample.gstRate,
      source: manglamProfile.seedMarker,
    },
    lowStockThreshold: sample.lowStockThreshold,
    metadata: {
      importTemplate: "manglam-demo",
      seedProfile: manglamProfile.seedMarker,
    },
    name: sample.name,
    purchaseCostCents: sample.purchaseCostCents,
    salesPriceCents: sample.salesPriceCents,
    sku: sample.sku,
    unitId: units.get(sample.unit)?.id ?? null,
    tenantId,
  };
  if (update) {
    const { sku, tenantId: _tenantId, ...updatePayload } = payload;
    return updatePayload;
  }
  return payload;
}

function tenantSettings() {
  return {
    demoProfile: manglamProfile.seedMarker,
    financialYear: manglamProfile.defaultFinancialYear,
    gstMode: manglamProfile.defaultGstMode,
    hardware: {
      defaultStockLocationCode: manglamProfile.defaultStockLocation.code,
      invoicePrefix: manglamProfile.invoicePrefix,
      quotationPrefix: manglamProfile.quotationPrefix,
      roundOffEnabled: manglamProfile.defaultRoundOff,
    },
    releaseChecklistRoute: manglamProfile.acceptanceRoute,
  };
}

function calculateLine(quantity, unitAmountCents, taxRateBps) {
  const subtotalCents = quantity * unitAmountCents;
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  return {
    lineTotalCents: subtotalCents + taxCents,
    subtotalCents,
    taxCents,
    unitAmountCents,
  };
}

function taxRateBpsFromConfig(value) {
  if (value && typeof value === "object" && "rate" in value && Number.isFinite(Number(value.rate))) {
    return Number(value.rate) * 100;
  }
  return 0;
}

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
