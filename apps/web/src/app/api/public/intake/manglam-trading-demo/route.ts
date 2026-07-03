import { getPrisma } from "@trustfirst/database";
import { NextResponse, type NextRequest } from "next/server";
import {
  type ManglamPublicIntakeInput,
  manglamPublicIntakeSchema,
} from "@/features/intake/manglam-intake-schema";
import { isAppError } from "@/server/domain/errors";
import { ManglamPublicIntakeService } from "@/server/intake/manglam-public-intake-service";
import { enforcePublicIntakeRateLimit } from "@/server/intake/public-intake-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ipAddress = readIpAddress(request);
    enforcePublicIntakeRateLimit(ipAddress ?? "unknown");

    const isJsonRequest = request.headers.get("content-type")?.includes("application/json") ?? false;
    const payload = manglamPublicIntakeSchema.parse(
      isJsonRequest ? await request.json() : formDataToIntakeInput(await request.formData()),
    );
    const service = new ManglamPublicIntakeService(getPrisma());
    const result = await service.submit(payload, {
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    });

    if (!isJsonRequest) {
      return NextResponse.redirect(
        new URL(`/intake/manglam-trading-demo/thank-you?submission=${encodeURIComponent(result.submissionNumber)}`, request.url),
        303,
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const isJsonRequest = request.headers.get("content-type")?.includes("application/json") ?? false;

    if (isAppError(error)) {
      if (!isJsonRequest) {
        return NextResponse.redirect(
          new URL(`/intake/manglam-trading-demo?error=${encodeURIComponent(error.code.toLowerCase())}`, request.url),
          303,
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error && typeof error === "object" && "issues" in error) {
      if (!isJsonRequest) {
        return NextResponse.redirect(
          new URL("/intake/manglam-trading-demo?error=validation", request.url),
          303,
        );
      }
      return NextResponse.json({ error: "Please correct the highlighted fields." }, { status: 422 });
    }

    if (!isJsonRequest) {
      return NextResponse.redirect(
        new URL("/intake/manglam-trading-demo?error=submit", request.url),
        303,
      );
    }

    return NextResponse.json({ error: "Unable to submit intake right now." }, { status: 500 });
  }
}

function readIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || null;
}

function formDataToIntakeInput(formData: FormData): ManglamPublicIntakeInput {
  return {
    access: {
      languagePreference: enumValue(formData, "access.languagePreference", ["english", "hindi", "both"], "both"),
      offlineNeed: textValue(formData, "access.offlineNeed"),
      rolesNeeded: listValue(formData, "access.rolesNeeded"),
    },
    business: {
      address: textValue(formData, "business.address"),
      businessType: textValue(formData, "business.businessType"),
      countersOrBranches: textValue(formData, "business.countersOrBranches"),
      gstin: textValue(formData, "business.gstin"),
      teamSize: textValue(formData, "business.teamSize"),
    },
    catalog: {
      barcodeUsage: textValue(formData, "catalog.barcodeUsage"),
      brandHandling: textValue(formData, "catalog.brandHandling"),
      productCategories: listValue(formData, "catalog.productCategories"),
      skuNeeds: textValue(formData, "catalog.skuNeeds"),
      unitTypes: listValue(formData, "catalog.unitTypes"),
    },
    company: {
      contactName: textValue(formData, "company.contactName"),
      email: textValue(formData, "company.email"),
      firmName: textValue(formData, "company.firmName"),
      phone: textValue(formData, "company.phone"),
      role: textValue(formData, "company.role"),
    },
    inventory: {
      godowns: textValue(formData, "inventory.godowns"),
      lowStockAlerts: textValue(formData, "inventory.lowStockAlerts"),
      openingStockReadiness: textValue(formData, "inventory.openingStockReadiness"),
      stockAdjustmentNeeds: textValue(formData, "inventory.stockAdjustmentNeeds"),
      stockTracking: textValue(formData, "inventory.stockTracking"),
    },
    notes: {
      currentSoftware: textValue(formData, "notes.currentSoftware"),
      painPoints: textValue(formData, "notes.painPoints"),
      successCriteria: textValue(formData, "notes.successCriteria"),
      targetDemoDate: textValue(formData, "notes.targetDemoDate"),
    },
    payments: {
      creditTerms: textValue(formData, "payments.creditTerms"),
      outstandingTracking: textValue(formData, "payments.outstandingTracking"),
      paymentModes: listValue(formData, "payments.paymentModes"),
    },
    purchase: {
      purchaseEntryNeeds: textValue(formData, "purchase.purchaseEntryNeeds"),
      supplierManagement: textValue(formData, "purchase.supplierManagement"),
      supplierPayments: textValue(formData, "purchase.supplierPayments"),
    },
    reports: {
      dashboardNeeds: textValue(formData, "reports.dashboardNeeds"),
      exportNeeds: textValue(formData, "reports.exportNeeds"),
      requiredReports: listValue(formData, "reports.requiredReports"),
    },
    sales: {
      billingFlow: textValue(formData, "sales.billingFlow"),
      discountNeeds: textValue(formData, "sales.discountNeeds"),
      gstBilling: textValue(formData, "sales.gstBilling"),
      printFormat: textValue(formData, "sales.printFormat"),
      quotationFlow: textValue(formData, "sales.quotationFlow"),
    },
  };
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function listValue(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function enumValue<T extends string>(formData: FormData, key: string, allowed: readonly T[], fallback: T) {
  const value = textValue(formData, key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}
