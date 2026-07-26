import { NextResponse, type NextRequest } from "next/server";
import { hardwareContext, hardwareError, hardwareResponse } from "@/server/hardware";

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get("role");
    if (role !== "customer" && role !== "supplier") {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "role must be customer or supplier." }, ok: false }, { status: 422 });
    }
    const { context, service } = await hardwareContext();
    return hardwareResponse(await service.ledger(context, role, request.nextUrl.searchParams.get("partyId") ?? undefined));
  } catch (error) {
    return hardwareError(error);
  }
}
