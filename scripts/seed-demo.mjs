import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const tenantSlug = process.env.DEMO_TENANT_SLUG ?? "trustfirst-demo-hardware";
const tenantName = process.env.DEMO_TENANT_NAME ?? "TrustFirst Demo Hardware";
const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? "demo-admin@trustfirst.example.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "TrustFirstDemo!2026");
const reset = process.argv.includes("--reset");

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

const demoData = {
  brands: ["GenericFlow", "SanitaryPro", "BuildRight"],
  categories: ["Bathroom Fittings", "Pipes", "Tools", "Adhesives"],
  customers: ["Sample Retail Customer", "Sample Project Customer"],
  products: [
    { barcode: "890000000001", category: "Pipes", name: "PVC Pipe 1 inch", sku: "PVC-PIPE-1", stock: 50 },
    { barcode: "890000000002", category: "Bathroom Fittings", name: "Chrome Basin Tap", sku: "CHR-TAP-1", stock: 20 },
    { barcode: "890000000003", category: "Adhesives", name: "Tile Adhesive Bag", sku: "TILE-ADH-20KG", stock: 35 },
  ],
  suppliers: ["Sample Hardware Supplier", "Sample Sanitary Supplier"],
  units: ["PCS", "BOX", "KG", "MTR"],
};

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!demoPassword) throw new Error("DEMO_ADMIN_PASSWORD is required when NODE_ENV=production.");

  const role = await seedRole();
  const tenant = await seedTenant();
  const user = await seedAdminUser();
  await seedMembership(tenant.id, user.id, role.id);

  if (reset) {
    await resetDemoHardware(tenant.id);
  }

  await seedHardware(tenant.id);

  console.log("Demo seed completed.");
  console.log(`Tenant: ${tenant.slug}`);
  console.log(`Admin: ${adminEmail}`);
  if (!process.env.DEMO_ADMIN_PASSWORD && process.env.NODE_ENV !== "production") {
    console.log("Default demo password used for local preview only.");
  }
} finally {
  await prisma.$disconnect();
}

async function seedRole() {
  const role = await prisma.role.upsert({
    create: {
      description: "Demo release admin role for preview validation.",
      key: "demo-release-admin",
      name: "Demo Release Admin",
      system: true,
    },
    update: {},
    where: { key: "demo-release-admin" },
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
      name: tenantName,
      slug: tenantSlug,
      status: "ACTIVE",
    },
    update: {
      name: tenantName,
      status: "ACTIVE",
    },
    where: { slug: tenantSlug },
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
      email: adminEmail,
      emailVerified: new Date(),
      name: "Demo Admin",
      normalizedEmail: adminEmail.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    update: {
      emailVerified: new Date(),
      name: "Demo Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    where: { normalizedEmail: adminEmail.toLowerCase() },
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
  const location = await prisma.hardwareStockLocation.upsert({
    create: { code: "MAIN", name: "Main Godown", tenantId },
    update: {},
    where: { tenantId_code: { code: "MAIN", tenantId } },
  });

  await prisma.hardwareBusinessSettings.upsert({
    create: {
      address: { city: "Demo City", line1: "Preview Market Road" },
      defaultStockLocationId: location.id,
      financialYear: "2026-2027",
      firmName: tenantName,
      invoicePrefix: "INV",
      phone: "9999999999",
      tenantId,
      termsFooter: "Demo terms. Replace before production use.",
    },
    update: {
      defaultStockLocationId: location.id,
      firmName: tenantName,
    },
    where: { tenantId },
  });

  const categories = new Map();
  for (const name of demoData.categories) {
    const category = await prisma.hardwareProductCategory.upsert({
      create: { name, slug: slugify(name), tenantId },
      update: {},
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
    categories.set(name, category);
  }

  for (const name of demoData.brands) {
    await prisma.hardwareBrand.upsert({
      create: { name, slug: slugify(name), tenantId },
      update: {},
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
  }

  for (const code of demoData.units) {
    await prisma.hardwareUnit.upsert({
      create: { code, name: code, tenantId },
      update: {},
      where: { tenantId_code: { code, tenantId } },
    });
  }

  for (const sample of demoData.products) {
    const product = await prisma.hardwareProduct.upsert({
      create: {
        barcode: sample.barcode,
        categoryId: categories.get(sample.category)?.id ?? null,
        lowStockThreshold: 5,
        name: sample.name,
        purchaseCostCents: 5000,
        salesPriceCents: 6500,
        sku: sample.sku,
        tenantId,
      },
      update: {
        barcode: sample.barcode,
        name: sample.name,
      },
      where: { tenantId_sku: { sku: sample.sku, tenantId } },
    });

    const existingMovement = await prisma.hardwareInventoryMovement.findFirst({
      where: { productId: product.id, referenceType: "demo_seed", tenantId },
    });
    if (!existingMovement) {
      await prisma.hardwareInventoryMovement.create({
        data: {
          locationId: location.id,
          productId: product.id,
          quantity: sample.stock,
          referenceType: "demo_seed",
          tenantId,
          type: "STOCK_IN",
        },
      });
    }
  }

  for (const name of [...demoData.customers, ...demoData.suppliers]) {
    await prisma.clientOrganization.upsert({
      create: {
        lifecycleStage: "CLIENT",
        name,
        slug: slugify(name),
        tenantId,
      },
      update: {},
      where: { tenantId_slug: { slug: slugify(name), tenantId } },
    });
  }
}

async function resetDemoHardware(tenantId) {
  const sampleSkus = demoData.products.map((product) => product.sku);
  const sampleClientSlugs = [...demoData.customers, ...demoData.suppliers].map(slugify);
  await prisma.$transaction([
    prisma.hardwareInventoryMovement.deleteMany({ where: { referenceType: "demo_seed", tenantId } }),
    prisma.hardwareProduct.deleteMany({ where: { sku: { in: sampleSkus }, tenantId } }),
    prisma.hardwareProductCategory.deleteMany({ where: { slug: { in: demoData.categories.map(slugify) }, tenantId } }),
    prisma.hardwareBrand.deleteMany({ where: { slug: { in: demoData.brands.map(slugify) }, tenantId } }),
    prisma.hardwareUnit.deleteMany({ where: { code: { in: demoData.units }, tenantId } }),
    prisma.clientOrganization.deleteMany({ where: { slug: { in: sampleClientSlugs }, tenantId } }),
  ]);
}

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}
