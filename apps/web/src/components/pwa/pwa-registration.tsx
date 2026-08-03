"use client";

import { Download, Maximize2, Minimize2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const offlineWarmRoutes = [
  "/admin",
  "/admin/hardware/products",
  "/admin/hardware/inventory",
  "/admin/hardware/purchases",
  "/admin/hardware/purchases/new",
  "/admin/hardware/sales",
  "/admin/hardware/quotations",
  "/admin/hardware/quotations/new",
  "/admin/hardware/suppliers",
  "/admin/hardware/customers",
  "/admin/hardware/outstanding",
  "/admin/hardware/ledger",
  "/admin/hardware/reports",
  "/admin/settings",
] as const;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function PwaRegistration() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [offlinePrepared, setOfflinePrepared] = useState(false);
  const isAdmin = pathname.startsWith("/admin");

  const warmOfflineRoutes = useCallback(async () => {
    if (!isAdmin || !navigator.onLine || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active ?? navigator.serviceWorker.controller;
    worker?.postMessage({ routes: offlineWarmRoutes, type: "WARM_ROUTES" });
  }, [isAdmin]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as NavigatorWithStandalone).standalone);
    const fullscreenSupported = Boolean(document.fullscreenEnabled);
    queueMicrotask(() => {
      setInstalled(standalone);
      setFullscreenAvailable(fullscreenSupported);
    });

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    function handleFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    let cancelled = false;

    function notifyUpdateAvailable() {
      window.dispatchEvent(new CustomEvent("trustfirst:pwa-update-available"));
    }

    function handleWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "OFFLINE_ROUTES_WARMED") {
        setOfflinePrepared(true);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleWorkerMessage);

    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;
        if (registration.waiting) notifyUpdateAvailable();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdateAvailable();
            }
          });
        });

        void warmOfflineRoutes();
      })
      .catch(() => {
        // PWA installation should not block the ERP if the browser refuses registration.
      });

    const handleOnline = () => {
      void warmOfflineRoutes();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", handleWorkerMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, [warmOfflineRoutes]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by browser or OS policy; the standalone app still works.
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="no-print pointer-events-none fixed bottom-3 left-3 z-50 flex flex-wrap items-center gap-2">
      {!installed && installPrompt ? (
        <button
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-md border border-amber-500/40 bg-zinc-950 px-3 text-sm font-medium text-white shadow-lg hover:bg-zinc-900"
          onClick={installApp}
          type="button"
        >
          <Download className="size-4" />
          Install ERP
        </button>
      ) : null}
      {fullscreenAvailable ? (
        <button
          aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
          className="pointer-events-auto hidden h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-lg sm:inline-flex"
          onClick={toggleFullscreen}
          type="button"
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      ) : null}
      {offlinePrepared ? (
        <span className="pointer-events-auto hidden rounded-md border border-emerald-600/30 bg-card px-2 py-1 text-xs text-emerald-700 shadow-sm dark:text-emerald-300 sm:inline">
          Offline shell ready
        </span>
      ) : null}
    </div>
  );
}
