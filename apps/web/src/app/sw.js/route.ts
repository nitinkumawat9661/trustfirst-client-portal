import { NextResponse, type NextRequest } from "next/server";
import { serviceWorkerCachePrefix } from "@/server/domain/app-branding";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "@/server/domain/host-routing";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const host = readEffectiveHost(request.headers);
  const surface = resolveAppSurfaceFromHost(host);
  const cacheName = `${serviceWorkerCachePrefix(surface)}-v2`;

  return new NextResponse(renderServiceWorker(cacheName), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function renderServiceWorker(cacheName: string) {
  return `
const CACHE_NAME = ${JSON.stringify(cacheName)};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if ("caches" in self) {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.includes("trustfirst") || key.includes("mangalam"))
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", () => {
  return;
});
`.trimStart();
}
