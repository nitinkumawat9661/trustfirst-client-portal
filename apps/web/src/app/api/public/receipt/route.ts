import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import { isAppError } from "@/server/domain/errors";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";
import { findPublicMangalamReceipt } from "@/server/billing/public-receipt-lookup";
import { enforcePublicReceiptRateLimit } from "@/server/billing/public-receipt-rate-limit";

export const dynamic = "force-dynamic";

const notFoundResponse = () =>
  NextResponse.json(
    { error: "Receipt could not be found." },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 404,
    },
  );

export async function GET(request: NextRequest) {
  try {
    const host = readEffectiveHost(request.headers);

    if (resolveAppSurfaceFromHost(host) !== "MANGALAM_PUBLIC") {
      return notFoundResponse();
    }

    enforcePublicReceiptRateLimit(readIpAddress(request));

    const documentNumber =
      request.nextUrl.searchParams.get("number")?.trim() ?? "";

    if (!documentNumber || documentNumber.length > 80) {
      return notFoundResponse();
    }

    const receipt = await findPublicMangalamReceipt(
      getPrisma(),
      documentNumber,
    );

    if (!receipt) {
      return notFoundResponse();
    }

    return NextResponse.json(
      {
        amountCents: receipt.amountCents,
        currency: receipt.currency,
        invoiceNumber: receipt.invoiceNumber,
        invoiceStatus: receipt.invoiceStatus,
        invoiceTitle: receipt.invoiceTitle,
        paidAmountCents: receipt.paidAmountCents,
        paymentMode: receipt.paymentMode,
        receiptNumber: receipt.receiptNumber,
        receivedAt: receipt.receivedAt.toISOString(),
        totalAmountCents: receipt.totalAmountCents,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (isAppError(error) && error.status === 429) {
      return NextResponse.json(
        { error: "Too many receipt lookup attempts. Please try again later." },
        {
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": "600",
          },
          status: 429,
        },
      );
    }

    return NextResponse.json(
      { error: "Unable to check the receipt right now." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}

function readIpAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}