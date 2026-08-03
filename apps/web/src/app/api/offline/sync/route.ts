import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { offlineError, offlineResponse } from "../../../../server/offline/http";
import { authenticateOfflineDevice } from "../../../../server/offline/offline-device-auth";
import { OfflineSyncService } from "../../../../server/offline/offline-sync-service";

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const device = await authenticateOfflineDevice(request, prisma);
    const body = await request.json() as { item?: unknown };
    const result = await new OfflineSyncService(prisma).process(device, body.item);
    return offlineResponse(result);
  } catch (error) {
    return offlineError(error);
  }
}
