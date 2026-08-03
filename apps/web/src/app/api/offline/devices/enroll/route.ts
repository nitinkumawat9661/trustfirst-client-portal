import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "../../../../../server/auth/session";
import { AppError } from "../../../../../server/domain/errors";
import { offlineError, offlineResponse } from "../../../../../server/offline/http";
import { OfflineService } from "../../../../../server/offline/offline-service";
import { assertCsrfSafeRequest } from "../../../../../server/security";

const enrollmentSchema = z.object({
  deviceKey: z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9._:-]+$/u),
  label: z.string().trim().max(120).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertCsrfSafeRequest(request);
    const user = await requireCurrentUser();
    if (!user.activeTenantId) {
      throw new AppError({ code: "BAD_REQUEST", message: "Select an active tenant before offline setup.", status: 400 });
    }
    const input = enrollmentSchema.parse(await request.json());
    const service = new OfflineService(getPrisma());
    const enrollment = await service.enrollDevice(
      { tenantId: user.activeTenantId, userId: user.id },
      input,
    );
    return offlineResponse(enrollment, 201);
  } catch (error) {
    return offlineError(error);
  }
}
