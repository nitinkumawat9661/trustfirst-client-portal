import {
  offlinePurchaseLabel,
  offlinePurchaseSeries,
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
  const totalCents = readNonNegativeInteger(input.clientTotalCents);
  const paidAmountCents = readNonNegativeInteger(input.paidAmountCents) ?? 0;
  if (totalCents === null) {
    return { message: "Counter sale total is invalid.", ok: false };
  }
  if (paidAmountCents > totalCents) {
    return { message: "Paid amount cannot exceed bill total.", ok: false };
  }

  const scope = readActiveOfflineScope();
  if (!scope) {
    return {
      message: "Offline tenant scope is unavailable. Reopen the installed ERP while online once, then retry.",
      ok: false,
    };
  }

  try {
    const queued = await queueReservedQuickPosSale(scope, input);
    const paymentStatus = paidAmountCents >= totalCents
      ? "paid"
      : paidAmountCents > 0
        ? "partial"
        : "unpaid";
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.invoiceNumber,
        label: "Counter sale",
      },
    }));
    return {
      data: {
        documentId: queued.queueItem.id,
        documentNumber: queued.documentNumber,
        invoiceId: null,
        invoiceNumber: queued.invoiceNumber,
        offlineQueued: true,
        paymentStatus,
        totalCents,
      } as unknown as T,
      ok: true,
    };
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

function readNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>;
  } catch {
    return {};
  }
}
