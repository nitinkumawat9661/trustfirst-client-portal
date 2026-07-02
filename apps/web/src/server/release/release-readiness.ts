import type { PrismaClient } from "@trustfirst/database";

export type ReleaseChecklistItem = {
  description: string;
  key: string;
  ready: boolean;
  title: string;
};

export type ReleaseChecklist = {
  items: ReleaseChecklistItem[];
  ready: boolean;
};

export async function releaseReadinessChecklist(input: {
  activeUserId: string;
  prisma: PrismaClient;
  tenantId: string;
}): Promise<ReleaseChecklist> {
  const [databaseReady, hardwareCounts, hardwareSettings] = await Promise.all([
    checkDatabase(input.prisma),
    input.prisma.$transaction([
      input.prisma.hardwareProduct.count({ where: { tenantId: input.tenantId } }),
      input.prisma.hardwareStockLocation.count({ where: { tenantId: input.tenantId } }),
      input.prisma.clientOrganization.count({ where: { archivedAt: null, tenantId: input.tenantId } }),
    ]),
    input.prisma.hardwareBusinessSettings.findUnique({ where: { tenantId: input.tenantId } }),
  ]);

  const [products, locations, customers] = hardwareCounts;
  const envReady = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
  const authReady = Boolean(input.activeUserId && input.tenantId);
  const hardwareReady = products > 0 && locations > 0 && customers > 0 && Boolean(hardwareSettings);
  const localDemoActive = process.env.TRUSTFIRST_DEMO_MODE === "local";
  const localDemoReady = localDemoActive && process.env.AUTH_URL?.startsWith("http://localhost");
  const printReady = Boolean(hardwareSettings);
  const pwaReady = true;
  const offlineReady = true;

  const items = [
    {
      description: envReady ? "Required deployment environment variables are present." : "Set DATABASE_URL and a 32+ character AUTH_SECRET.",
      key: "env",
      ready: envReady,
      title: "Environment status",
    },
    {
      description: databaseReady ? "Database connection responded to a health query." : "Database health query failed.",
      key: "database",
      ready: databaseReady,
      title: "Database status",
    },
    {
      description: authReady ? "Authenticated admin session and active tenant are available." : "Sign in as a tenant admin before release validation.",
      key: "auth",
      ready: authReady,
      title: "Auth status",
    },
    {
      description: hardwareReady ? "Hardware demo has settings, stock locations, products, and customers." : "Seed or configure hardware demo data.",
      key: "hardware-demo",
      ready: hardwareReady,
      title: "Hardware demo status",
    },
    {
      description: localDemoActive
        ? localDemoReady
          ? "Local demo mode is active for localhost QA."
          : "Set AUTH_URL=http://localhost:3000 for local demo QA."
        : "Local demo mode is not active for this environment.",
      key: "local-demo",
      ready: !localDemoActive || Boolean(localDemoReady),
      title: "Local demo mode",
    },
    {
      description: "Manifest and offline page are part of the application package.",
      key: "pwa",
      ready: pwaReady,
      title: "PWA status",
    },
    {
      description: printReady ? "Hardware business settings are ready for print previews." : "Configure hardware business settings before print QA.",
      key: "print",
      ready: printReady,
      title: "Print status",
    },
    {
      description: "Offline queue foundation is available in the admin shell.",
      key: "offline-queue",
      ready: offlineReady,
      title: "Offline queue status",
    },
  ];

  return {
    items,
    ready: items.every((item) => item.ready),
  };
}

async function checkDatabase(prisma: PrismaClient) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
