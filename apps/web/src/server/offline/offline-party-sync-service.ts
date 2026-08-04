import { type Prisma, type PrismaClient } from "@trustfirst/database";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { QueuedMutation } from "../../lib/offline-queue";
import { AppError } from "../domain/errors";
import { quickHardwarePartySchema, type QuickHardwarePartyInput } from "../hardware/schemas";
import type { HardwarePartyRole, HardwarePartySummary } from "../hardware/types";
import type { AuthenticatedOfflineDevice } from "./offline-device-auth";

const partyPayloadSchema = z.object({
  input: z.record(z.string(), z.unknown()),
});

const partySyncItemSchema = z.object({
  action: z.literal("hardware.partyDraft.create"),
  id: z.string().trim().min(1).max(180),
  idempotencyKey: z.string().trim().min(12).max(180),
  payload: z.record(z.string(), z.unknown()),
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

const storedPartyResultSchema = z.object({
  balanceSide: z.enum(["DR", "CR"]).nullable(),
  contact: z.string().nullable(),
  currentBalanceCents: z.number().int(),
  gstin: z.string().nullable(),
  id: z.string(),
  name: z.string(),
  openingBalanceCents: z.number().int(),
  role: z.enum(["customer", "supplier"]),
});

type SyncReceiptRow = {
  result: unknown;
  status: string;
};

type PartyIdentity = {
  deviceId: string;
  idempotencyKey: string;
  queueItemId: string;
};

export class OfflinePartySyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(
    device: AuthenticatedOfflineDevice,
    rawItem: unknown,
  ): Promise<HardwarePartySummary> {
    const item = partySyncItemSchema.parse(rawItem);
    if (item.tenantId !== device.tenantId || item.userId !== device.userId) {
      throw conflict("Queued party belongs to a different tenant or user.");
    }

    const payload = partyPayloadSchema.parse(item.payload);
    const input = quickHardwarePartySchema.parse(payload.input);
    enforcePartyPermission(device.permissions, input.role);
    const identity: PartyIdentity = {
      deviceId: device.id,
      idempotencyKey: item.idempotencyKey,
      queueItemId: item.id,
    };

    return this.prisma.$transaction(async (tx) => {
      await lockPartyIdentity(tx, device.tenantId, input);

      const receipt = await findReceipt(tx, device, item.id, item.idempotencyKey);
      if (receipt?.status === "SUCCESS") return parseStoredResult(receipt.result);
      if (receipt) {
        throw conflict("This party already has a non-success sync receipt and requires review.");
      }

      const parties = await tx.clientOrganization.findMany({
        include: {
          contacts: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            select: { phone: true },
            take: 1,
          },
        },
        where: {
          archivedAt: null,
          deletedAt: null,
          tenantId: device.tenantId,
        },
      });
      const duplicate = findDuplicateParty(parties, input);
      if (duplicate) {
        const customFields = asRecord(duplicate.customFields);
        if (!matchesOfflineIdentity(customFields, identity)) {
          throw conflict("A server party with the same name or mobile already exists. Review the offline conflict instead of merging it automatically.");
        }
        if (!hardwarePartyRoles(customFields).includes(input.role)) {
          throw conflict("Recovered offline party has an invalid customer or supplier role.");
        }
        const result = toPartySummary(duplicate, input.role);
        await saveSuccessReceipt(tx, device, item, result);
        return result;
      }

      const signedOpening = signedOpeningBalance(input);
      const customFields = buildPartyCustomFields(input, identity, signedOpening);
      const party = await tx.clientOrganization.create({
        data: {
          customFields: customFields as Prisma.InputJsonValue,
          lifecycleStage: "CLIENT",
          name: input.name,
          slug: await nextPartySlug(tx, device.tenantId, input.name),
          tenantId: device.tenantId,
        },
      });
      const mobile = normalizeMobile(input.mobile);
      if (mobile) {
        await tx.clientContact.create({
          data: {
            clientId: party.id,
            email: `${party.id}@local.invalid`,
            isPrimary: true,
            name: party.name,
            normalizedEmail: `${party.id}@local.invalid`,
            phone: mobile,
            tenantId: device.tenantId,
          },
        });
      }

      const result = toPartySummary({
        ...party,
        contacts: mobile ? [{ phone: mobile }] : [],
      }, input.role);
      await saveSuccessReceipt(tx, device, item, result);
      return result;
    });
  }
}

async function lockPartyIdentity(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: QuickHardwarePartyInput,
) {
  const locks = [
    `offline-party:${tenantId}:name:${normalizeComparable(input.name)}`,
    ...(normalizeMobile(input.mobile)
      ? [`offline-party:${tenantId}:mobile:${normalizeMobile(input.mobile)}`]
      : []),
  ].sort();
  for (const lock of locks) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lock}))`;
  }
}

async function findReceipt(
  tx: Prisma.TransactionClient,
  device: AuthenticatedOfflineDevice,
  queueItemId: string,
  idempotencyKey: string,
) {
  const rows = await tx.$queryRaw<SyncReceiptRow[]>`
    SELECT "result", "status"
    FROM "OfflineSyncReceipt"
    WHERE "tenantId" = ${device.tenantId}
      AND "deviceId" = ${device.id}
      AND ("queueItemId" = ${queueItemId} OR "idempotencyKey" = ${idempotencyKey})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function saveSuccessReceipt(
  tx: Prisma.TransactionClient,
  device: AuthenticatedOfflineDevice,
  item: Pick<QueuedMutation, "action" | "id" | "idempotencyKey">,
  result: HardwarePartySummary,
) {
  const resultJson = JSON.stringify(result);
  await tx.$executeRaw`
    INSERT INTO "OfflineSyncReceipt" (
      "id", "tenantId", "deviceId", "queueItemId", "idempotencyKey", "action",
      "status", "result", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${device.tenantId}, ${device.id}, ${item.id}, ${item.idempotencyKey}, ${item.action},
      'SUCCESS', ${resultJson}::jsonb, NOW(), NOW()
    )
    ON CONFLICT ("deviceId", "queueItemId")
    DO UPDATE SET "status" = 'SUCCESS', "result" = EXCLUDED."result", "updatedAt" = NOW()
  `;
}

function findDuplicateParty<T extends {
  contacts: Array<{ phone: string | null }>;
  customFields: unknown;
  name: string;
}>(parties: T[], input: QuickHardwarePartyInput) {
  const name = normalizeComparable(input.name);
  const mobile = normalizeMobile(input.mobile);
  return parties.find((party) => {
    const customFields = asRecord(party.customFields);
    const existingMobile = normalizeMobile(party.contacts[0]?.phone ?? readText(customFields.phone));
    return normalizeComparable(party.name) === name || Boolean(mobile && existingMobile === mobile);
  });
}

function buildPartyCustomFields(
  input: QuickHardwarePartyInput,
  identity: PartyIdentity,
  signedOpening: number,
) {
  return compactRecord({
    address: input.address,
    gstin: input.gstin,
    hardwareOpeningBalances: { [input.role]: signedOpening },
    hardwarePartyRole: input.role,
    hardwarePartyRoles: [input.role],
    offlineDeviceId: identity.deviceId,
    offlineIdempotencyKey: identity.idempotencyKey,
    offlineSyncQueueItemId: identity.queueItemId,
    offlineSyncedAt: new Date().toISOString(),
    openingBalanceCents: signedOpening,
    openingBalanceDirection: input.balanceDirection,
    phone: normalizeMobile(input.mobile),
  });
}

function matchesOfflineIdentity(customFields: Record<string, unknown>, identity: PartyIdentity) {
  return customFields.offlineDeviceId === identity.deviceId
    && customFields.offlineIdempotencyKey === identity.idempotencyKey
    && customFields.offlineSyncQueueItemId === identity.queueItemId;
}

function toPartySummary(
  party: {
    contacts: Array<{ phone: string | null }>;
    customFields: unknown;
    id: string;
    name: string;
  },
  role: HardwarePartyRole,
): HardwarePartySummary {
  const customFields = asRecord(party.customFields);
  const balances = asRecord(customFields.hardwareOpeningBalances);
  const openingBalanceCents = readNumber(balances[role])
    ?? (readText(customFields.hardwarePartyRole) === role
      ? readNumber(customFields.openingBalanceCents) ?? 0
      : 0);
  return {
    balanceSide: balanceSideFor(role, openingBalanceCents),
    contact: party.contacts[0]?.phone ?? readText(customFields.phone) ?? null,
    currentBalanceCents: openingBalanceCents,
    gstin: readText(customFields.gstin) ?? null,
    id: party.id,
    name: party.name,
    openingBalanceCents,
    role,
  };
}

function signedOpeningBalance(input: QuickHardwarePartyInput) {
  const amount = input.openingBalanceCents ?? 0;
  if (amount === 0) return 0;
  return input.balanceDirection === "CR" ? -amount : amount;
}

function balanceSideFor(role: HardwarePartyRole, value: number): "DR" | "CR" | null {
  if (value === 0) return null;
  return role === "supplier"
    ? value > 0 ? "CR" : "DR"
    : value > 0 ? "DR" : "CR";
}

function hardwarePartyRoles(customFields: Record<string, unknown>): HardwarePartyRole[] {
  const roles = Array.isArray(customFields.hardwarePartyRoles)
    ? customFields.hardwarePartyRoles.filter(
        (value): value is HardwarePartyRole => value === "customer" || value === "supplier",
      )
    : [];
  const legacy = customFields.hardwarePartyRole;
  if ((legacy === "customer" || legacy === "supplier") && !roles.includes(legacy)) roles.push(legacy);
  return roles;
}

async function nextPartySlug(
  tx: Prisma.TransactionClient,
  tenantId: string,
  name: string,
) {
  const base = slugify(name) || "party";
  for (let index = 1; index <= 10_000; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const existing = await tx.clientOrganization.findFirst({
      select: { id: true },
      where: { slug: candidate, tenantId },
    });
    if (!existing) return candidate;
  }
  throw new AppError({
    code: "INTERNAL_ERROR",
    message: "A unique party slug could not be allocated.",
    status: 500,
  });
}

function enforcePartyPermission(permissions: string[], role: HardwarePartyRole) {
  const required = role === "supplier" ? "hardware.purchase.manage" : "hardware.sales.manage";
  if (
    !permissions.includes("*")
    && !permissions.includes("hardware.plugin.manage")
    && !permissions.includes(required)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: `The enrolled device no longer has permission to sync ${role === "supplier" ? "suppliers" : "customers"}.`,
      status: 403,
    });
  }
}

function parseStoredResult(value: unknown): HardwarePartySummary {
  const parsed = storedPartyResultSchema.safeParse(value);
  if (!parsed.success) throw conflict("Stored party sync receipt is invalid.");
  return parsed.data;
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function normalizeMobile(value: string | null | undefined) {
  const digits = value?.replace(/\D+/gu, "") ?? "";
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("en-IN")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 100);
}

function compactRecord(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function conflict(message: string) {
  return new AppError({ code: "CONFLICT", message, status: 409 });
}

export const offlinePartySyncTestUtils = {
  balanceSideFor,
  buildPartyCustomFields,
  matchesOfflineIdentity,
  normalizeComparable,
  normalizeMobile,
  signedOpeningBalance,
  slugify,
};
