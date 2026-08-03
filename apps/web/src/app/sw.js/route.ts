import { NextResponse, type NextRequest } from "next/server";
import { serviceWorkerCachePrefix } from "../../server/domain/app-branding";
import {
  readEffectiveHost,
  resolveAppSurfaceFromHost,
} from "../../server/domain/host-routing";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const host = readEffectiveHost(request.headers);
  const surface = resolveAppSurfaceFromHost(host);
  const cacheName = `${serviceWorkerCachePrefix(surface)}-v3`;

  return new NextResponse(renderServiceWorker(cacheName), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function renderServiceWorker(cacheName: string) {
  return `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const STATIC_CACHE = CACHE_NAME + "-static";
const PAGE_CACHE = CACHE_NAME + "-pages";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/pwa-icon.svg",
  "/icons/pwa-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(new Request(url, {
      cache: "reload",
      credentials: "same-origin"
    }))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.includes("trustfirst") || key.includes("mangalam") || key.includes("business-workspace"))
      .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  if (data.type === "CLEAR_PRIVATE_CACHES") {
    event.waitUntil(caches.delete(PAGE_CACHE));
    return;
  }

  if (data.type === "WARM_ROUTES" && Array.isArray(data.routes)) {
    event.waitUntil(warmRoutes(data.routes, event.source));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirstPage(request));
  }
});

async function warmRoutes(routes, source) {
  const cache = await caches.open(PAGE_CACHE);
  let cached = 0;

  for (const value of routes) {
    try {
      const url = new URL(String(value), self.location.origin);
      if (url.origin !== self.location.origin || !url.pathname.startsWith("/admin")) continue;
      const request = new Request(url.toString(), {
        credentials: "same-origin",
        headers: { "X-TrustFirst-Offline-Warmup": "1" }
      });
      const response = await fetch(request);
      if (!isCacheablePage(response)) continue;
      await cache.put(request, response.clone());
      cached += 1;
    } catch {
      // A failed module must not prevent the remaining routes from warming.
    }
  }

  source?.postMessage?.({ type: "OFFLINE_ROUTES_WARMED", cached });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheablePage(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const exact = await cache.match(request);
    if (exact) return exact;

    if (request.mode === "navigate") {
      const staticCache = await caches.open(STATIC_CACHE);
      const offline = await staticCache.match(OFFLINE_URL);
      if (offline) return offline;
    }

    return new Response(JSON.stringify({
      error: "OFFLINE_NOT_CACHED",
      message: "This page has not been prepared for offline use yet."
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
      status: 503
    });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

function isCacheablePage(response) {
  if (!response || !response.ok || response.type === "opaqueredirect") return false;
  const contentType = response.headers.get("Content-Type") || "";
  return contentType.includes("text/html") || contentType.includes("text/x-component");
}

function shouldBypass(pathname) {
  return pathname === "/sw.js"
    || pathname.startsWith("/api/")
    || pathname.startsWith("/signin")
    || pathname.startsWith("/sign-in")
    || pathname.startsWith("/auth/");
}

function isStaticAsset(pathname) {
  return /\\.(?:css|js|mjs|svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/i.test(pathname);
}
`.trimStart();
}
