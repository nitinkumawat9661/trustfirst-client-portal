import { getPrisma } from "@trustfirst/database";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/server/auth/session";
import { resolveStorageAssetPath } from "@/server/storage/local-storage-path";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user.activeTenantId) return NextResponse.json({ error: "Active tenant is required." }, { status: 403 });

  const tenant = await getPrisma().tenant.findUnique({
    select: { branding: true, slug: true },
    where: { id: user.activeTenantId },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant was not found." }, { status: 404 });

  const branding = asRecord(tenant.branding);
  const logo = asRecord(branding.logo);
  const assetKey = typeof logo.assetKey === "string" ? logo.assetKey : null;
  const tenantPrefix = `client-assets/${tenant.slug}/branding/`;
  if (!assetKey || !assetKey.startsWith(tenantPrefix)) {
    return NextResponse.json({ error: "Tenant logo is not configured." }, { status: 404 });
  }

  const assetPath = resolveStorageAssetPath(assetKey);
  if (!assetPath) {
    return NextResponse.json({ error: "Invalid tenant logo reference." }, { status: 400 });
  }

  try {
    const body = await readFile(assetPath);
    const contentType =
      logo.mimeType === "image/png" || logo.mimeType === "image/webp"
        ? logo.mimeType
        : "image/jpeg";
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tenant logo asset was not found." }, { status: 404 });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
