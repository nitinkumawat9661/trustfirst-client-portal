import type { QueueSnapshot, QueuedMutation } from "./types";

export function getOfflineBannerState(online: boolean) {
  return {
    message: online ? "Online. Offline queue is ready." : "Offline. New hardware actions will be queued on this device.",
    visible: !online,
  };
}

export function getSyncStatusViewModel(snapshot: QueueSnapshot, online: boolean) {
  if (!online) return { tone: "warning" as const, text: `${snapshot.pending} pending offline` };
  if (snapshot.failed > 0) return { tone: "error" as const, text: `${snapshot.failed} failed sync action${snapshot.failed === 1 ? "" : "s"}` };
  if (snapshot.pending > 0 || snapshot.syncing > 0) return { tone: "info" as const, text: `${snapshot.pending + snapshot.syncing} action${snapshot.pending + snapshot.syncing === 1 ? "" : "s"} waiting to sync` };
  return { tone: "success" as const, text: "All actions synced" };
}

export function splitQueuePanels(items: QueuedMutation[]) {
  return {
    failed: items.filter((item) => item.status === "failed"),
    pending: items.filter((item) => item.status === "pending" || item.status === "syncing"),
  };
}
