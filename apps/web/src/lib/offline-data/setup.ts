import {
  IndexedDbOfflineDataStorage,
  offlineSetupSummary,
  type OfflineDataStorage,
} from "./storage";
import {
  offlineSnapshotSchemaVersion,
  type OfflineDataScope,
  type OfflineDeviceEnrollment,
  type OfflineSetupSummary,
  type OfflineSnapshot,
} from "./types";

type ApiResult<T> =
  | { data: T; ok: true }
  | { error?: { message?: string }; ok: false };

export async function setupOfflineDevice(
  scope: OfflineDataScope,
  storage: OfflineDataStorage = new IndexedDbOfflineDataStorage(),
): Promise<OfflineSetupSummary> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    throw new Error("Internet is required for first-time offline device setup.");
  }

  const previous = await storage.read(scope);
  const deviceKey = previous?.enrollment.deviceKey ?? `mangalam-${crypto.randomUUID()}`;
  const enrollment = await requestJson<OfflineDeviceEnrollment>("/api/offline/devices/enroll", {
    body: JSON.stringify({
      deviceKey,
      label: deviceLabel(),
      metadata: {
        platform: navigator.platform || "unknown",
        standalone: window.matchMedia("(display-mode: standalone)").matches,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  assertScope(enrollment, scope, "Enrolled device");
  const snapshot = await requestJson<OfflineSnapshot>(
    `/api/offline/snapshot?deviceId=${encodeURIComponent(enrollment.deviceId)}`,
    { cache: "no-store" },
  );
  assertScope(snapshot, scope, "Offline snapshot");
  if (snapshot.schemaVersion !== offlineSnapshotSchemaVersion) {
    throw new Error("Offline snapshot version is not supported by this app.");
  }

  await storage.write(scope, enrollment, snapshot);
  const summary = offlineSetupSummary(await storage.read(scope));
  if (!summary) throw new Error("Offline data could not be verified after saving.");
  return summary;
}

export async function readOfflineSetupSummary(
  scope: OfflineDataScope,
  storage: OfflineDataStorage = new IndexedDbOfflineDataStorage(),
) {
  return offlineSetupSummary(await storage.read(scope));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("The server could not be reached during offline setup.");
  }
  const result = await response.json() as ApiResult<T>;
  if (!response.ok || !result.ok) {
    throw new Error(!result.ok ? result.error?.message ?? "Offline setup failed." : "Offline setup failed.");
  }
  return result.data;
}

function deviceLabel() {
  const platform = navigator.platform?.trim() || "Computer";
  return `${platform} · ${new Date().toLocaleDateString("en-IN")}`.slice(0, 120);
}

function assertScope(value: OfflineDataScope, scope: OfflineDataScope, label: string) {
  if (value.tenantId !== scope.tenantId || value.userId !== scope.userId) {
    throw new Error(`${label} belongs to a different tenant or user.`);
  }
}
