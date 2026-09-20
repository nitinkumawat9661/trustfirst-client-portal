import { NextResponse } from "next/server"
import { validation } from "../../../../config/validation"
import { isAdminRequest } from "../../../../lib/security/admin-session"
import { enforceSameOrigin, readJsonBody, RequestSecurityError } from "../../../../lib/security/request"
import { CatalogValidationError, getCatalogConfig, saveCatalogConfig } from "../../../../lib/server/catalog"
import { consumeRequestRateLimit } from "../../../../lib/server/rate-limit"

export async function GET() {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
  try {
    return NextResponse.json({ ok: true, ...(await getCatalogConfig()) }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("admin-catalog-get", error)
    return NextResponse.json({ ok: false, error: "CATALOG_UNAVAILABLE" }, { status: 503 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
  try {
    enforceSameOrigin(request)
    const allowed = await consumeRequestRateLimit("admin-catalog", request, validation.rateLimits.adminMutation)
    if (!allowed) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 })
    const body = await readJsonBody<{ catalog?: unknown }>(request)
    return NextResponse.json({ ok: true, ...(await saveCatalogConfig(body.catalog)) })
  } catch (error) {
    if (error instanceof CatalogValidationError) return NextResponse.json({ ok: false, error: error.code }, { status: 422 })
    if (error instanceof RequestSecurityError) return NextResponse.json({ ok: false, error: error.code }, { status: error.status })
    console.error("admin-catalog-save", error)
    return NextResponse.json({ ok: false, error: "CATALOG_SAVE_FAILED" }, { status: 503 })
  }
}
