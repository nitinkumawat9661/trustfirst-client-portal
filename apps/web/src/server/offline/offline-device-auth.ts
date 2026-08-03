import type { PrismaClient } from "@trustfirst/database";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { AppError } from "../domain/errors";
import { PermissionResolverService } from "../permissions/permission-service";

type DeviceRow = {
  id: string;
  tenantId: string;
  userId: string;
};

export type AuthenticatedOfflineDevice = DeviceRow & {
  permissions: string[];
};

export async function authenticateOfflineDevice(
  request: NextRequest,
  prisma: PrismaClient,
): Promise<AuthenticatedOfflineDevice> {
  const deviceId = request.headers.get("x-offline-device-id")?.trim();
  const token = request.headers.get("x-offline-device-token")?.trim();
  if (!deviceId || !token || deviceId.length > 80 || token.length > 200) {
    throw new AppError({ code: "UNAUTHORIZED", message: "Offline device credentials are required.", status: 401 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await prisma.$queryRaw<DeviceRow[]>`
    SELECT "id", "tenantId", "userId"
    FROM "OfflineDevice"
    WHERE "id" = ${deviceId}
      AND "tokenHash" = ${tokenHash}
      AND "status" = 'ACTIVE'
      AND "revokedAt" IS NULL
    LIMIT 1
  `;
  const device = rows[0];
  if (!device) {
    throw new AppError({ code: "UNAUTHORIZED", message: "Offline device credentials are invalid or revoked.", status: 401 });
  }

  const resolved = await new PermissionResolverService(prisma).resolveForMembership(device.userId, device.tenantId);
  await prisma.$executeRaw`
    UPDATE "OfflineDevice"
    SET "lastSeenAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${device.id}
  `;
  return {
    ...device,
    permissions: resolved.permissions.map(String),
  };
}
