import type { NextRequest } from "next/server";
import {
  hardwareBillEditContext,
  hardwareBillUpdateSchema,
  hardwareError,
  hardwareResponse,
  parseHardwareJson,
} from "@/server/hardware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareBillEditContext();
    const input = await parseHardwareJson(request, hardwareBillUpdateSchema);
    return hardwareResponse(await service.updateBill(context, documentId, input));
  } catch (error) {
    return hardwareError(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const { context, service } = await hardwareBillEditContext();
    return hardwareResponse(await service.auditHistory(context, documentId));
  } catch (error) {
    return hardwareError(error);
  }
}
