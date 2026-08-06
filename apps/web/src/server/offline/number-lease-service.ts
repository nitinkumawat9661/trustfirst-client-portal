import {
  DocumentSequenceKind,
  type Prisma,
  type PrismaClient,
} from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import {
  type OfflineNumberLease,
  type OfflineNumberSeries,
} from "../../lib/offline-data/types";
import { financialYearForDate } from "../billing/document-sequence";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions/permission-service";

type ActorContext = {
  tenantId: string;
  userId: string;
};

type LeaseRow = {
  deviceId: string;
  endValue: number;
  expiresAt: Date;
  financialYear: string;
  format: string;
  id: string;
  nextValue: number;
  prefix: string;
  series: string;
  startValue: number;
};

type SeriesConfig = {
  format: "invoice" | "trade";
  permission: string;
  prefix: string;
  series: OfflineNumberSeries;
};

const seriesConfigs: SeriesConfig[] = [
  { format: "trade", permission: "hardware.sales.manage", prefix: "HSO", series: "HSO" },
  { format: "trade", permission: "hardware.sales.manage", prefix: "HSQ", series: "HSQ" },
  { format: "trade", permission: "hardware.sales.manage", prefix: "HSR", series: "HSR" },
  { format: "invoice", permission: "hardware.sales.manage", prefix: "MS/INV", series: "MS/INV" },
  { format: "trade", permission: "hardware.purchase.manage", prefix: "HPE", series: "HPE" },
  { format: "trade", permission: "hardware.purchase.manage", prefix: "HPO", series: "HPO" },
  { format: "trade", permission: "hardware.purchase.manage", prefix: "HPR", series: "HPR" },
  { format: "trade", permission: "hardware.purchase.manage", prefix: "HSB", series: "HSB" },
];

export class OfflineNumberLeaseService {
  private readonly permissions: PermissionResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.permissions = new PermissionResolverService(prisma);
  }

  async reserve(context: ActorContext, deviceId: string, requestedBlockSize = 100) {
    const blockSize = normalizeBlockSize(requestedBlockSize);
    const resolved = await this.permissions.resolveForMembership(context.userId, context.tenantId);
    await this.assertDevice(context, deviceId);
    const permissions = resolved.permissions.map(String);
    const configs = seriesConfigs.filter((config) => allowed(permissions, config.permission));

    for (const config of configs) {
      const financialYear = config.format === "invoice"
        ? financialYearForDate(new Date())
        : String(new Date().getUTCFullYear());
      const existing = await this.findUsableLease(context.tenantId, deviceId, config.series, financialYear);
      if (existing) continue;
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw<Array<{ locked: number }>>`
          SELECT 1::int AS "locked"
          FROM pg_advisory_xact_lock(hashtext(${`${context.tenantId}:${config.series}:${financialYear}`}))
        `;
        const concurrent = await findUsableLeaseWithClient(tx, context.tenantId, deviceId, config.series, financialYear);
        if (concurrent) return;
        if (config.format === "invoice") {
          await reserveInvoiceLease(tx, context.tenantId, deviceId, config, financialYear, blockSize);
        } else {
          await reserveTradeLease(tx, context.tenantId, deviceId, config, financialYear, blockSize);
        }
      });
    }

    return this.listForDevice(context, deviceId);
  }

  async listForDevice(context: ActorContext, deviceId: string): Promise<OfflineNumberLease[]> {
    await this.assertDevice(context, deviceId);
    const rows = await this.prisma.$queryRaw<LeaseRow[]>`
      SELECT "id", "deviceId", "series", "format", "prefix", "financialYear",
             "startValue", "endValue", "nextValue", "expiresAt"
      FROM "OfflineDocumentLease"
      WHERE "tenantId" = ${context.tenantId}
        AND "deviceId" = ${deviceId}
        AND "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
        AND "nextValue" <= "endValue"
      ORDER BY "series" ASC, "createdAt" DESC
    `;
    return rows.map(toLease);
  }

  private async findUsableLease(
    tenantId: string,
    deviceId: string,
    series: OfflineNumberSeries,
    financialYear: string,
  ) {
    return findUsableLeaseWithClient(this.prisma, tenantId, deviceId, series, financialYear);
  }

  private async assertDevice(context: ActorContext, deviceId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "OfflineDevice"
      WHERE "id" = ${deviceId}
        AND "tenantId" = ${context.tenantId}
        AND "userId" = ${context.userId}
        AND "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
      LIMIT 1
    `;
    if (!rows[0]) {
      throw new AppError({ code: "NOT_FOUND", message: "Enrolled offline device was not found.", status: 404 });
    }
  }
}

async function reserveTradeLease(
  tx: Prisma.TransactionClient,
  tenantId: string,
  deviceId: string,
  config: SeriesConfig,
  financialYear: string,
  blockSize: number,
) {
  const documentPrefix = `${config.prefix}-${financialYear}-`;
  const documents = await tx.hardwareTradeDocument.findMany({
    select: { documentNumber: true },
    where: { documentNumber: { startsWith: documentPrefix }, tenantId },
  });
  const documentMax = documents.reduce((maximum, document) => {
    const value = Number(document.documentNumber.slice(documentPrefix.length));
    return Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
  }, 0);
  const leaseMax = await maximumLeasedValue(tx, tenantId, config.series, financialYear);
  await insertLease(tx, {
    blockSize,
    deviceId,
    financialYear,
    format: config.format,
    prefix: config.prefix,
    series: config.series,
    startValue: Math.max(documentMax, leaseMax) + 1,
    tenantId,
  });
}

async function reserveInvoiceLease(
  tx: Prisma.TransactionClient,
  tenantId: string,
  deviceId: string,
  config: SeriesConfig,
  financialYear: string,
  blockSize: number,
) {
  const sequence = await tx.documentSequence.findUnique({
    select: { lastValue: true },
    where: {
      tenantId_kind_financialYear: {
        financialYear,
        kind: DocumentSequenceKind.INVOICE,
        tenantId,
      },
    },
  });
  const leaseMax = await maximumLeasedValue(tx, tenantId, config.series, financialYear);
  const startValue = Math.max(sequence?.lastValue ?? 0, leaseMax) + 1;
  const endValue = startValue + blockSize - 1;
  await tx.documentSequence.upsert({
    create: {
      financialYear,
      kind: DocumentSequenceKind.INVOICE,
      lastValue: endValue,
      tenantId,
    },
    update: { lastValue: endValue },
    where: {
      tenantId_kind_financialYear: {
        financialYear,
        kind: DocumentSequenceKind.INVOICE,
        tenantId,
      },
    },
  });
  await insertLease(tx, {
    blockSize,
    deviceId,
    financialYear,
    format: config.format,
    prefix: config.prefix,
    series: config.series,
    startValue,
    tenantId,
  });
}

async function insertLease(
  tx: Prisma.TransactionClient,
  input: {
    blockSize: number;
    deviceId: string;
    financialYear: string;
    format: "invoice" | "trade";
    prefix: string;
    series: OfflineNumberSeries;
    startValue: number;
    tenantId: string;
  },
) {
  const endValue = input.startValue + input.blockSize - 1;
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "OfflineDocumentLease" (
      "id", "tenantId", "deviceId", "series", "format", "prefix", "financialYear",
      "startValue", "endValue", "nextValue", "status", "expiresAt", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${input.tenantId}, ${input.deviceId}, ${input.series}, ${input.format}, ${input.prefix}, ${input.financialYear},
      ${input.startValue}, ${endValue}, ${input.startValue}, 'ACTIVE', ${expiresAt}, NOW(), NOW()
    )
  `;
}

async function maximumLeasedValue(
  client: Prisma.TransactionClient | PrismaClient,
  tenantId: string,
  series: OfflineNumberSeries,
  financialYear: string,
) {
  const rows = await client.$queryRaw<Array<{ maximum: number }>>`
    SELECT COALESCE(MAX("endValue"), 0)::int AS "maximum"
    FROM "OfflineDocumentLease"
    WHERE "tenantId" = ${tenantId}
      AND "series" = ${series}
      AND "financialYear" = ${financialYear}
  `;
  return rows[0]?.maximum ?? 0;
}

async function findUsableLeaseWithClient(
  client: Prisma.TransactionClient | PrismaClient,
  tenantId: string,
  deviceId: string,
  series: OfflineNumberSeries,
  financialYear: string,
) {
  const rows = await client.$queryRaw<LeaseRow[]>`
    SELECT "id", "deviceId", "series", "format", "prefix", "financialYear",
           "startValue", "endValue", "nextValue", "expiresAt"
    FROM "OfflineDocumentLease"
    WHERE "tenantId" = ${tenantId}
      AND "deviceId" = ${deviceId}
      AND "series" = ${series}
      AND "financialYear" = ${financialYear}
      AND "status" = 'ACTIVE'
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
      AND "nextValue" <= "endValue"
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] ? toLease(rows[0]) : null;
}

function toLease(row: LeaseRow): OfflineNumberLease {
  if (!isOfflineSeries(row.series) || (row.format !== "trade" && row.format !== "invoice")) {
    throw new AppError({ code: "INTERNAL_ERROR", message: "Invalid offline number lease was found.", status: 500 });
  }
  return {
    deviceId: row.deviceId,
    endValue: row.endValue,
    expiresAt: row.expiresAt.toISOString(),
    financialYear: row.financialYear,
    format: row.format,
    id: row.id,
    nextValue: row.nextValue,
    prefix: row.prefix,
    series: row.series,
    startValue: row.startValue,
  };
}

function normalizeBlockSize(value: number) {
  if (!Number.isInteger(value) || value < 10 || value > 500) {
    throw new AppError({ code: "VALIDATION_ERROR", message: "Offline number block size must be between 10 and 500.", status: 422 });
  }
  return value;
}

function allowed(permissions: string[], permission: string) {
  return permissions.includes("*") || permissions.includes("hardware.plugin.manage") || permissions.includes(permission);
}

function isOfflineSeries(value: string): value is OfflineNumberSeries {
  return ["HPE", "HPO", "HPR", "HSB", "HSO", "HSQ", "HSR", "MS/INV"].includes(value);
}
