import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const profilePath = path.join(
  projectRoot,
  "config",
  "client-profiles",
  "manglam-trading-demo",
  "official-identity.json",
);
const profile = JSON.parse(await readFile(profilePath, "utf8"));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
assertSafeDemoDatabase(databaseUrl);

const logoPath = path.resolve(projectRoot, "storage", profile.branding.logo.assetKey);
const storageRoot = `${path.resolve(projectRoot, "storage")}${path.sep}`;
if (!logoPath.startsWith(storageRoot)) throw new Error("The configured logo asset is outside tenant storage.");
const logo = await readFile(logoPath);
const digest = createHash("sha256").update(logo).digest("hex");
if (digest !== profile.branding.logo.sha256) throw new Error("Approved logo integrity verification failed.");

const requireFromDatabase = createRequire(new URL("../packages/database/package.json", import.meta.url));
const { PrismaClient } = requireFromDatabase("@prisma/client");
const prisma = new PrismaClient();

try {
  const tenant = await prisma.tenant.findUnique({ where: { slug: profile.tenantSlug } });
  if (!tenant) throw new Error("The existing demo tenant was not found; identity application will not create it.");

  const countsBefore = await operationalCounts(tenant.id);
  const previousBranding = asObject(tenant.branding);
  const previousSettings = asObject(tenant.settings);
  const officialIdentity = {
    ...profile.legalIdentity,
    status: profile.identityStatus,
    source: "GST_REGISTRATION_CERTIFICATE_REG_06",
  };

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      data: {
        branding: {
          ...previousBranding,
          displayName: profile.branding.displayName,
          logo: profile.branding.logo,
          officialIdentity,
          status: profile.identityStatus,
          tagline: profile.branding.tagline,
        },
        name: profile.legalIdentity.tradeName,
        settings: {
          ...previousSettings,
          commercialConfiguration: profile.commercialConfiguration,
          configurationHistory: {
            priorDemoConfiguration: {
              name: previousSettings.firmName ?? tenant.name,
              status: profile.supersededConfigurationStatus,
            },
          },
          officialIdentity,
        },
      },
      where: { id: tenant.id },
    });

    const existingSettings = await tx.hardwareBusinessSettings.findUnique({ where: { tenantId: tenant.id } });
    if (!existingSettings) throw new Error("Hardware business settings must exist before applying official identity.");
    await tx.hardwareBusinessSettings.update({
      data: {
        address: profile.legalIdentity.principalAddress,
        firmName: profile.legalIdentity.tradeName,
        gstin: profile.legalIdentity.gstin,
        logoPlaceholder: profile.branding.logo.assetKey,
      },
      where: { tenantId: tenant.id },
    });
  });

  const countsAfter = await operationalCounts(tenant.id);
  if (JSON.stringify(countsBefore) !== JSON.stringify(countsAfter)) {
    throw new Error("Operational record counts changed while applying identity.");
  }

  console.log("Official tenant identity applied and logo integrity verified.");
  console.log(`Tenant slug: ${profile.tenantSlug}`);
  console.log("Operational product, stock, client, and supplier records were not changed.");
} finally {
  await prisma.$disconnect();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function operationalCounts(tenantId) {
  const [products, movements, clients] = await Promise.all([
    prisma.hardwareProduct.count({ where: { tenantId } }),
    prisma.hardwareInventoryMovement.count({ where: { tenantId } }),
    prisma.clientOrganization.count({ where: { tenantId } }),
  ]);
  return { clients, movements, products };
}

function assertSafeDemoDatabase(value) {
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const databaseName = parsed.pathname.replace(/^\/+/, "").toLowerCase();
  const safeHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const safeDatabase = databaseName === "trustfirst_demo" || databaseName === "trustfirst_manglam_demo";
  if (!safeHost || !safeDatabase || /prod|production|live/.test(value.toLowerCase())) {
    throw new Error("Identity application is restricted to the isolated TrustFirst demo database.");
  }
}
