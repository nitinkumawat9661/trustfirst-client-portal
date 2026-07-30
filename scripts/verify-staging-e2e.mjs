import { createRequire } from "node:module";

if (!process.env.DATABASE_URL?.toLowerCase().includes("staging")) {
  throw new Error("Refusing E2E verification against a database that is not staging-named.");
}

const requireFromDatabase = createRequire(new URL("../packages/database/package.json", import.meta.url));
const { PrismaClient } = requireFromDatabase("@prisma/client");
const prisma = new PrismaClient();
const partyName = "E2E Dual Role Traders";

try {
  const parties = await prisma.clientOrganization.findMany({
    where: { archivedAt: null, deletedAt: null, name: partyName },
  });
  if (parties.length !== 1) {
    throw new Error(`Expected exactly one dual-role party, found ${parties.length}.`);
  }
  const party = parties[0];
  const customFields = party.customFields && typeof party.customFields === "object" && !Array.isArray(party.customFields)
    ? party.customFields
    : {};
  const roles = Array.isArray(customFields.hardwarePartyRoles) ? customFields.hardwarePartyRoles : [];
  if (!roles.includes("customer") || !roles.includes("supplier")) {
    throw new Error(`Expected customer and supplier roles, found ${JSON.stringify(roles)}.`);
  }

  const [invoices, purchases, estimates, financials] = await Promise.all([
    prisma.invoice.count({ where: { archivedAt: null, clientId: party.id } }),
    prisma.hardwareTradeDocument.findMany({
      where: {
        archivedAt: null,
        supplierId: party.id,
        type: { in: ["PURCHASE_ENTRY", "SUPPLIER_BILL", "PURCHASE_ORDER"] },
      },
    }),
    prisma.hardwareTradeDocument.findMany({
      include: { items: true },
      where: {
        archivedAt: null,
        customerId: party.id,
        metadata: { equals: "E2E-ESTIMATE-001", path: ["referenceNumber"] },
        status: "CONFIRMED",
        type: "SALES_QUOTATION",
      },
    }),
    prisma.financialTransaction.count({ where: { partyId: party.id, status: "POSTED" } }),
  ]);

  if (invoices < 1) throw new Error("Quick POS did not persist a customer invoice.");
  if (!purchases.some((document) => document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata) && document.metadata.referenceNumber === "E2E-PURCHASE-001")) {
    throw new Error("Purchase flow did not persist the expected supplier document.");
  }
  if (estimates.length !== 1) throw new Error(`Expected one confirmed E2E Estimate Bill, found ${estimates.length}.`);
  if (estimates[0].items[0]?.quantity !== 2) throw new Error("Estimate edit did not persist the updated quantity.");
  if (financials < 2) throw new Error("Expected posted customer financial transactions from sale and Estimate flows.");

  const estimateMovements = await prisma.hardwareInventoryMovement.count({
    where: { referenceId: estimates[0].id, tenantId: estimates[0].tenantId },
  });
  if (estimateMovements < 3) {
    throw new Error("Estimate create/edit did not create the expected stock-out and reversal movements.");
  }

  console.log("MANGALAM_STAGING_E2E_DATABASE_VERIFIED");
  console.log(`party_id=${party.id}`);
  console.log(`invoices=${invoices}`);
  console.log(`purchases=${purchases.length}`);
  console.log(`estimate_movements=${estimateMovements}`);
  console.log(`financial_transactions=${financials}`);
} finally {
  await prisma.$disconnect();
}
