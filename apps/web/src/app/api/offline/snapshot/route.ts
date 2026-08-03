import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "../../../../server/auth/session";
import { AppError } from "../../../../server/domain/errors";
import { offlineError, offlineResponse } from "../../../../server/offline/http";
import { OfflineService } from "../../../../server/offline/offline-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!user.activeTenantId) {
      throw new AppError({ code: "BAD_REQUEST", message: "Select an active tenant before offline setup.", status: 400 });
    }
    const deviceId = request.nextUrl.searchParams.get("deviceId");
    const service = new OfflineService(getPrisma());
    const snapshot = await service.snapshot(
      { tenantId: user.activeTenantId, userId: user.id },
      deviceId,
    );
    return offlineResponse(snapshot);
  } catch (error) {
    return offlineError(error);
  }
}
