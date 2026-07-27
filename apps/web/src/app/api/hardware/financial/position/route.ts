import { NextResponse, type NextRequest } from "next/server";
import { hardwareError, hardwareFinancialContext, hardwareResponse } from "@/server/hardware";

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get("role");
    const partyId = request.nextUrl.searchParams.get("partyId");
    if (role !== "customer" && role !== "supplier") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "role must be customer or supplier." }, ok: false }, { status: 422 });
    }
    if (!partyId) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "partyId is required." }, ok: false }, { status: 422 });
    }
    const { context, service } = await hardwareFinancialContext();
    return hardwareResponse(await service.partyPosition(context, role, partyId));
  } catch (error) {
    return hardwareError(error);
  }
}
