import {
  buildQueuedQuickPosResult,
  offlinePurchaseLabel,
  offlinePurchaseSeries,
  queueOfflinePartyDraft,
  queueReservedQuickPosSale,
  queueReservedTradeDraft,
  readActiveOfflineScope,
} from "../../lib/offline-data";

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
  ok?: boolean;
};

export type HardwareApiResult<T> =
  | { data: T; ok: true }
  | { message: string; ok: false };

export async function postHardwareJson<T>(
  endpoint: string,
  body?: unknown,
): Promise<HardwareApiResult<T>> {
  return sendHardwareJson<T>(endpoint, "POST", body);
}

export async function postHardwarePartyJson<T>(
  body: Record<string, unknown>,
): Promise<HardwareApiResult<T>> {
  const offlineParty = await queueOfflineParty<T>(body);
  if (offlineParty) return offlineParty;
  return sendHardwareJson<T>("/api/hardware/parties/quick-add", "POST", body);
}

export async function patchHardwareJson<T>(
  endpoint: string,
  body?: unknown,
): Promise<HardwareApiResult<T>> {
  return sendHardwareJson<T>(endpoint, "PATCH", body);
}

export async function getHardwareJson<T>(endpoint: string): Promise<HardwareApiResult<T>> {
  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    const result = await readEnvelope<T>(response);
    if (!response.ok || !result.ok) {
      return {
        message: result.error?.message ?? "The request could not be completed.",
        ok: false,
      };
    }
    return { data: result.data as T, ok: true };
  } catch {
    return {
      message: "The server could not be reached. Check the connection and retry.",
      ok: false,
    };
  }
}

async function sendHardwareJson<T>(
  endpoint: string,
  method: "PATCH" | "POST",
  body?: unknown,
): Promise<HardwareApiResult<T>> {
  const offlineCustomerBlock = blockOfflineCustomerCreation<T>(endpoint, method);
  if (offlineCustomerBlock) return offlineCustomerBlock;

  const offlineQuickPos = await queueOfflineQuickPos<T>(endpoint, method, body);
  if (offlineQuickPos) return offlineQuickPos;

  const offlinePurchase = await queueOfflinePurchase<T>(endpoint, method, body);
  if (offlinePurchase) return offlinePurchase;

  try {
    const response = await fetch(endpoint, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { "content-type": "application/json" },
      method,
    });
    const result = await readEnvelope<T>(response);
    if (!response.ok || !result.ok) {
      return {
        message: result.error?.message ?? "The request could not be completed.",
        ok: false,
      };
    }
    return { data: result.data as T, ok: true };
  } catch {
    return {
      message: "The server could not be reached. Check the connection and retry.",
      ok: false,
    };
  }
}

function blockOfflineCustomerCreation<T>(
  endpoint: string,
  method: "PATCH" | "POST",
): HardwareApiResult<T> | null {
  if (
    typeof navigator === "undefined" ||
    navigator.onLine ||
    method !== "POST" ||
    endpoint !== "/api/hardware/parties/quick-add"
  ) {
    return null;
  }
  return {
    message: "Offline counter sales require an existing saved customer. Use Walk-in Customer or reconnect once to create this customer.",
    ok: false,
  };
}

async function queueOfflineParty<T>(
  body: Record<string, unknown>,
): Promise<HardwareApiResult<T> | null> {
  if (
    typeof window === "undefined"
    || typeof navigator === "undefined"
    || navigator.onLine
  ) {
    return null;
  }
  const scope = readActiveOfflineScope();
  if (!scope) {
    return {
      message: "Offline tenant scope is unavailable. Reopen the installed ERP while online once, then retry.",
      ok: false,
    };
  }
  try {
    const queued = await queueOfflinePartyDraft(scope, body);
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.party.name,
        label: queued.party.role === "supplier" ? "Supplier" : "Customer",
      },
    }));
    return { data: queued.party as unknown as T, ok: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Party could not be saved to the offline queue.",
      ok: false,
    };
  }
}

async function queueOfflineQuickPos<T>(
  endpoint: string,
  method: "PATCH" | "POST",
  body: unknown,
): Promise<HardwareApiResult<T> | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    navigator.onLine ||
    method !== "POST" ||
    endpoint !== "/api/hardware/pos/sale"
  ) {
    return null;
  }

  const input = asRecord(body);
  const scope = readActiveOfflineScope();
  if (!scope) {
    return {
      message: "Offline tenant scope is unavailable. Reopen the installed ERP while online once, then retry.",
      ok: false,
    };
  }

  try {
    const queued = await queueReservedQuickPosSale(scope, input);
    const result = buildQueuedQuickPosResult(input, {
      documentNumber: queued.documentNumber,
      invoiceNumber: queued.invoiceNumber,
      queueItemId: queued.queueItem.id,
    });
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.invoiceNumber,
        label: "Counter sale",
      },
    }));
    return { data: result as unknown as T, ok: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Counter sale could not be saved to the offline queue.",
      ok: false,
    };
  }
}

async function queueOfflinePurchase<T>(
  endpoint: string,
  method: "PATCH" | "POST",
  body: unknown,
): Promise<HardwareApiResult<T> | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    navigator.onLine ||
    method !== "POST" ||
    endpoint !== "/api/hardware/purchases"
  ) {
    return null;
  }

  const input = asRecord(body);
  const series = offlinePurchaseSeries(input.type);
  if (!series) {
    return {
      message: "This purchase document type is not available offline.",
      ok: false,
    };
  }
  const scope = readActiveOfflineScope();
  if (!scope) {
    return {
      message: "Offline tenant scope is unavailable. Reopen the installed ERP while online once, then retry.",
      ok: false,
    };
  }

  try {
    const queued = await queueReservedTradeDraft(scope, {
      confirm: false,
      input,
      series,
    });
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.documentNumber,
        label: offlinePurchaseLabel(input.type),
      },
    }));
    return {
      data: {
        documentNumber: queued.documentNumber,
        id: queued.queueItem.id,
        offlineQueued: true,
      } as unknown as T,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Purchase could not be saved to the offline queue.",
      ok: false,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>;
  } catch {
    return {};
  }
}
