import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "../../../../../server/auth/session";
import { AppError } from "../../../../../server/domain/errors";
import { offlineError, offlineResponse } from "../../../../../server/offline/http";
import { OfflineNumberLeaseService } from "../../../../../server/offline/number-lease-service";
import { assertCsrfSafeRequest } from "../../../../../server/security";

const reserveSchema = z.object({
  blockSize: z.number().int().min(10).max(500).optional(),
  deviceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const user = await requireCurrentUser();
    if (!user.activeTenantId) {
      throw new AppError({ code: "BAD_REQUEST", message: "Select an active tenant before reserving offline numbers.", status: 400 });
    }
    const input = reserveSchema.parse(await request.json());
    const service = new OfflineNumberLeaseService(getPrisma());
    const leases = await service.reserve(
      { tenantId: user.activeTenantId, userId: user.id },
      input.deviceId,
      input.blockSize,
    );
    return offlineResponse(leases);
  } catch (error) {
    return offlineError(error);
  }
}
