import { getPrisma } from "@trustfirst/database";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const TENANT_SLUG = "manglam-trading-demo";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenant = await getPrisma().tenant.findUnique({
    select: { branding: true },
    where: { slug: TENANT_SLUG },
  });
  const branding = asRecord(tenant?.branding);
  const logo = asRecord(branding.logo);
  const assetKey = typeof logo.assetKey === "string" ? logo.assetKey : null;
  const prefix = `client-assets/${TENANT_SLUG}/branding/`;
  if (logo.status !== "LOCKED" || !assetKey?.startsWith(prefix)) {
    return NextResponse.json({ error: "Approved logo is not configured." }, { status: 404 });
  }
  const storageRoot = path.resolve(process.cwd(), "storage");
  const assetPath = path.resolve(storageRoot, assetKey);
  if (!assetPath.startsWith(`${storageRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid logo reference." }, { status: 400 });
  }
  try {
    const contentType =
      logo.mimeType === "image/png" || logo.mimeType === "image/webp"
        ? logo.mimeType
        : "image/jpeg";
    return new NextResponse(await readFile(assetPath), {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Approved logo asset was not found." }, { status: 404 });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
