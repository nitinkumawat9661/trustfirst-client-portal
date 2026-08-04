import { getPrisma } from "@trustfirst/database";
import type { NextRequest } from "next/server";
import { AppError } from "../../../../../server/domain/errors";
import { hardwareError, hardwareResponse } from "../../../../../server/hardware/http";
import { requireCurrentUser } from "../../../../../server/auth/session";

type ReceiptRow = {
  action: string;
  result: unknown;
  status: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueItemId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.activeTenantId ?? "public";
    const { queueItemId } = await params;
    const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
    if (!deviceId || deviceId.length > 80 || !queueItemId || queueItemId.length > 180) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "A valid offline payment receipt identity is required.", status: 422 });
    }
    const rows = await getPrisma().$queryRaw<ReceiptRow[]>`
      SELECT receipt."action", receipt."result", receipt."status"
      FROM "OfflineSyncReceipt" receipt
      INNER JOIN "OfflineDevice" device ON device."id" = receipt."deviceId"
      WHERE receipt."tenantId" = ${tenantId}
        AND receipt."deviceId" = ${deviceId}
        AND receipt."queueItemId" = ${queueItemId}
        AND receipt."action" = 'hardware.partyPaymentDraft.create'
        AND receipt."status" = 'SUCCESS'
        AND device."tenantId" = ${tenantId}
        AND device."userId" = ${user.id}
        AND device."status" = 'ACTIVE'
        AND device."revokedAt" IS NULL
      LIMIT 1
    `;
    const receipt = rows[0];
    if (!receipt) {
      throw new AppError({ code: "NOT_FOUND", message: "Synced offline payment receipt was not found.", status: 404 });
    }
    return hardwareResponse(receipt);
  } catch (error) {
    return hardwareError(error);
  }
}
