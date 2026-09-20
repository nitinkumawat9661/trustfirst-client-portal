import { NextResponse } from "next/server"
import { getCatalogConfig } from "../../../lib/server/catalog"

export async function GET() {
  try {
    const result = await getCatalogConfig()
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("public-catalog", error)
    return NextResponse.json({ ok: false, error: "CATALOG_UNAVAILABLE" }, { status: 503 })
  }
}
