import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { manglamPublicIntakeSchema } from "@/features/intake/manglam-intake-schema";
import { isAppError } from "@/server/domain/errors";
import { ManglamPublicIntakeService } from "@/server/intake/manglam-public-intake-service";
import { enforcePublicIntakeRateLimit } from "@/server/intake/public-intake-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ipAddress = readIpAddress(request);
    enforcePublicIntakeRateLimit(ipAddress ?? "unknown");

    const payload = manglamPublicIntakeSchema.parse(await request.json());
    const service = new ManglamPublicIntakeService(getPrisma());
    const result = await service.submit(payload, {
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Please correct the highlighted fields." }, { status: 422 });
    }

    return NextResponse.json({ error: "Unable to submit intake right now." }, { status: 500 });
  }
}

function readIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || null;
}
