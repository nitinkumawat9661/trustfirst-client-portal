import { NextResponse } from "next/server"
import { createCatalogImageViewUrl, isCatalogImageKey } from "../../../../lib/server/r2"

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") || ""
  if (!isCatalogImageKey(key)) return NextResponse.json({ ok: false, error: "INVALID_IMAGE_KEY" }, { status: 404 })
  try {
    const url = await createCatalogImageViewUrl(key)
    return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "private, max-age=300" } })
  } catch (error) {
    console.error("catalog-image", error)
    return NextResponse.json({ ok: false, error: "IMAGE_UNAVAILABLE" }, { status: 404 })
  }
}
