"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@trustfirst/ui";
import { AlertTriangle, CheckCircle2, Database, HardDriveDownload, RefreshCw, Trash2, Wifi, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readOfflineSetupSummary,
  refreshOfflineDeviceSnapshot,
  setupOfflineDevice,
  type OfflineSetupSummary,
} from "@/lib/offline-data";
import {
  getOfflineBannerState,
  getSyncStatusViewModel,
  LocalStorageOfflineQueueStorage,
  OfflineMutationQueue,
  processOfflineQueue,
  splitQueuePanels,
  type OfflineQueueScope,
  type QueueSnapshot,
  type QueuedMutation,
} from "@/lib/offline-queue";

const emptySnapshot: QueueSnapshot = {
  failed: 0,
  pending: 0,
  scopedKey: "",
  synced: 0,
  syncing: 0,
  total: 0,
};

type OfflineSyncPanelProps = {
  scope: OfflineQueueScope;
};

export function OfflineSyncPanel({ scope }: OfflineSyncPanelProps) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<QueuedMutation[]>([]);
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(emptySnapshot);
  const [syncing, setSyncing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineSetup, setOfflineSetup] = useState<OfflineSetupSummary | null>(null);
  const [preparingOffline, setPreparingOffline] = useState(false);
  const [offlineSetupError, setOfflineSetupError] = useState<string | null>(null);

  const queue = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new OfflineMutationQueue({
      scope,
      storage: new LocalStorageOfflineQueueStorage(window.localStorage),
    });
  }, [scope]);

  const refresh = useCallback(async () => {
    if (!queue) return;
    const [nextItems, nextSnapshot] = await Promise.all([queue.list(), queue.snapshot()]);
    setItems(nextItems);
    setSnapshot(nextSnapshot);
  }, [queue]);

  const refreshOfflineSetupState = useCallback(async () => {
    try {
      setOfflineSetup(await readOfflineSetupSummary(scope));
    } catch {
      setOfflineSetup(null);
    }
  }, [scope]);

  const refreshEnrolledSnapshot = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const summary = await refreshOfflineDeviceSnapshot(scope);
      if (summary) setOfflineSetup(summary);
    } catch {
      // A stale snapshot remains usable when an automatic refresh cannot complete.
    }
  }, [scope]);

  const sync = useCallback(async () => {
    if (!queue || !navigator.onLine) return;
    setSyncing(true);
    try {
      await processOfflineQueue(queue);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [queue, refresh]);

  const prepareOffline = useCallback(async () => {
    if (!navigator.onLine) return;
    setPreparingOffline(true);
    setOfflineSetupError(null);
    try {
      const summary = await setupOfflineDevice(scope);
      setOfflineSetup(summary);
    } catch (error) {
      setOfflineSetupError(error instanceof Error ? error.message : "Offline device setup failed.");
    } finally {
      setPreparingOffline(false);
    }
  }, [scope]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh();
      void refreshOfflineSetupState();
    }, 0);

    function handleOnline() {
      setOnline(true);
      void sync();
      void refreshEnrolledSnapshot();
    }

    function handleOffline() {
      setOnline(false);
    }

    function handleQueueChanged() {
      void refresh();
    }

    function handleUpdateAvailable() {
      setUpdateAvailable(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
    window.addEventListener("trustfirst:pwa-update-available", handleUpdateAvailable);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("trustfirst:offline-queue-changed", handleQueueChanged);
      window.removeEventListener("trustfirst:pwa-update-available", handleUpdateAvailable);
    };
  }, [refresh, refreshEnrolledSnapshot, refreshOfflineSetupState, sync]);

  const banner = getOfflineBannerState(online);
  const status = getSyncStatusViewModel(snapshot, online);
  const panels = splitQueuePanels(items);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-3 sm:left-auto sm:w-[28rem]">
      {banner.visible ? (
        <div className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border bg-card p-3 text-sm shadow-lg">
          <WifiOff aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
          <p>{banner.message}</p>
        </div>
      ) : null}
      {updateAvailable ? (
        <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card p-3 text-sm shadow-lg">
          <span>App update available.</span>
          <Button onClick={() => window.location.reload()} size="sm" type="button">
            Refresh
          </Button>
        </div>
      ) : null}
      {panelOpen ? <Card className="pointer-events-auto w-full shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Offline sync</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{status.text}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(status.tone === "error" && "border-destructive text-destructive")}>
              {online ? "online" : "offline"}
            </Badge>
            <Button aria-label="Close offline sync panel" onClick={() => setPanelOpen(false)} size="sm" type="button" variant="ghost"><X className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Database className="size-4" />
                  Offline device data
                </p>
                {offlineSetup ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ready · {offlineSetup.productCount} products · {offlineSetup.partyCount} parties · {offlineSetup.stockRowCount} stock rows
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Run once while online to enroll this device and save its tenant data.
                  </p>
                )}
              </div>
              {offlineSetup ? <Badge>ready</Badge> : <Badge>not set</Badge>}
            </div>
            {offlineSetup ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Snapshot: {new Date(offlineSetup.generatedAt).toLocaleString("en-IN")}
              </p>
            ) : null}
            {offlineSetupError ? <p className="mt-2 text-xs text-destructive">{offlineSetupError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={!online || preparingOffline} onClick={prepareOffline} size="sm" type="button">
                <HardDriveDownload className={cn("size-4", preparingOffline && "animate-pulse")} />
                {preparingOffline ? "Preparing…" : offlineSetup ? "Refresh offline data" : "Setup offline device"}
              </Button>
              <Button disabled={!online || preparingOffline || !offlineSetup} onClick={refreshEnrolledSnapshot} size="sm" type="button" variant="outline">
                <RefreshCw className="size-4" />
                Update snapshot
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label="Pending" value={snapshot.pending + snapshot.syncing} />
            <Metric label="Failed" value={snapshot.failed} />
            <Metric label="Synced" value={snapshot.synced} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!online || syncing} onClick={sync} size="sm" type="button" variant="outline">
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
              Sync now
            </Button>
            <Button onClick={refresh} size="sm" type="button" variant="ghost">
              Refresh status
            </Button>
          </div>
          <QueuePanel
            empty="No pending actions."
            icon="pending"
            items={panels.pending}
            title="Pending actions"
          />
          <QueuePanel
            empty="No failed actions."
            icon="failed"
            items={panels.failed}
            onClear={async (id) => {
              await queue?.clearFailed(id);
              await refresh();
            }}
            onRetry={async (id) => {
              await queue?.retryFailed(id);
              await sync();
            }}
            title="Failed actions"
          />
        </CardContent>
      </Card> : (
        <button
          aria-label={`Open offline sync panel. ${status.text}`}
          className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-lg"
          onClick={() => setPanelOpen(true)}
          type="button"
        >
          {online ? <Wifi className="size-4 text-emerald-700 dark:text-emerald-300" /> : <WifiOff className="size-4 text-amber-700 dark:text-amber-300" />}
          <span>{offlineSetup ? "Offline ready" : "Sync"}</span>
          {snapshot.pending + snapshot.failed > 0 ? <Badge>{snapshot.pending + snapshot.failed}</Badge> : null}
        </button>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="font-mono text-base font-semibold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function QueuePanel({
  empty,
  icon,
  items,
  onClear,
  onRetry,
  title,
}: {
  empty: string;
  icon: "failed" | "pending";
  items: QueuedMutation[];
  onClear?: (id: string) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  title: string;
}) {
  return (
    <details className="rounded-md border border-border p-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        {icon === "failed" ? (
          <AlertTriangle aria-hidden className="size-4 text-destructive" />
        ) : (
          <CheckCircle2 aria-hidden className="size-4 text-muted-foreground" />
        )}
        {title}
        <Badge>{items.length}</Badge>
      </summary>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
        {items.map((item) => (
          <div className="rounded-md border border-border p-2 text-xs" key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.action}</p>
                <p className="mt-1 text-muted-foreground">
                  Attempts {item.attemptCount} · Seq {item.sequence}
                </p>
                {item.error ? <p className="mt-1 text-destructive">{item.error}</p> : null}
              </div>
              {item.status === "failed" ? (
                <div className="flex gap-1">
                  <Button onClick={() => onRetry?.(item.id)} size="sm" type="button" variant="outline">
                    <RefreshCw className="size-3" />
                  </Button>
                  <Button onClick={() => onClear?.(item.id)} size="sm" type="button" variant="ghost">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
