import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { offlineError, offlineResponse } from "../../../../server/offline/http";
import { authenticateOfflineDevice } from "../../../../server/offline/offline-device-auth";
import { OfflineQuickPosSyncService } from "../../../../server/offline/offline-quick-pos-sync-service";
import { OfflineSyncService } from "../../../../server/offline/offline-sync-service";

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const device = await authenticateOfflineDevice(request, prisma);
    const body = await request.json() as { item?: unknown };
    const action = readAction(body.item);
    const result = action === "hardware.quickPosSale.create"
      ? await new OfflineQuickPosSyncService(prisma).process(device, body.item)
      : await new OfflineSyncService(prisma).process(device, body.item);
    return offlineResponse(result);
  } catch (error) {
    return offlineError(error);
  }
}

function readAction(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as { action?: unknown }).action
    : null;
}
