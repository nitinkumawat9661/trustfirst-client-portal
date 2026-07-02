import { createRequire } from "node:module";
import { demoEnv, assertSafeDemoDatabaseUrl, validateRequiredEnv, run } from "./demo-utils.mjs";
import { manglamProfile, manglamSeedData } from "./manglam-demo-profile.mjs";

const requireFromDatabaseWorkspace = createRequire(new URL("../packages/database/package.json", import.meta.url));
const { PrismaClient } = requireFromDatabaseWorkspace("@prisma/client");

const env = demoEnv();
validateRequiredEnv(env);
assertSafeDemoDatabaseUrl(env.DATABASE_URL);

run("npm", ["run", "seed:manglam-demo"], { env });

const prisma = new PrismaClient();
try {
  const tenant = await prisma.tenant.findUnique({ where: { slug: manglamProfile.tenantSlug } });
  if (!tenant) throw new Error(`Tenant ${manglamProfile.tenantSlug} was not found after seed.`);

  const [
    adminUser,
    settings,
    categories,
    products,
    stockLocations,
    stockMovements,
    clients,
    tradeDocuments,
    invoices,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { normalizedEmail: manglamProfile.adminEmail.toLowerCase() } }),
    prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: tenant.id } }),
    prisma.hardwareProductCategory.count({ where: { tenantId: tenant.id } }),
    prisma.hardwareProduct.count({ where: { tenantId: tenant.id } }),
    prisma.hardwareStockLocation.count({ where: { tenantId: tenant.id } }),
    prisma.hardwareInventoryMovement.count({ where: { tenantId: tenant.id, referenceType: manglamProfile.seedMarker } }),
    prisma.clientOrganization.count({ where: { tenantId: tenant.id, metadata: { path: ["seedProfile"], equals: manglamProfile.seedMarker } } }),
    prisma.hardwareTradeDocument.count({ where: { tenantId: tenant.id, metadata: { path: ["seedProfile"], equals: manglamProfile.seedMarker } } }),
    prisma.invoice.count({ where: { tenantId: tenant.id } }),
  ]);

  const expectedClients = manglamSeedData.customers.length + manglamSeedData.suppliers.length;
  assert(adminUser, "Admin user was not found.");
  assert(settings, "Hardware settings were not found.");
  assert(categories >= manglamSeedData.categories.length, "Expected product categories were not seeded.");
  assert(products >= manglamSeedData.products.length, "Expected products were not seeded.");
  assert(stockLocations >= manglamSeedData.locations.length, "Expected stock locations were not seeded.");
  assert(stockMovements >= manglamSeedData.products.length, "Expected opening stock movements were not seeded.");
  assert(clients >= expectedClients, "Expected customers/suppliers were not seeded.");
  assert(tradeDocuments >= manglamSeedData.tradeDocuments.length, "Expected demo trade documents were not seeded.");

  console.log("Manglam local demo seed verification passed.");
  console.log(`Tenant: ${tenant.slug}`);
  console.log(`Admin: ${manglamProfile.adminEmail}`);
  console.log(`Products: ${products}`);
  console.log(`Opening stock movements: ${stockMovements}`);
  console.log(`Customers/suppliers: ${clients}`);
  console.log(`Demo trade documents: ${tradeDocuments}`);
  console.log(`Billing invoices found: ${invoices}`);
} finally {
  await prisma.$disconnect();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
