import {
  buildQueuedQuickPosResult,
  offlinePurchaseLabel,
  offlinePurchaseSeries,
  queueOfflineCatalogProduct,
  queueOfflinePartyDraft,
  queueOfflinePartyPayment,
  queueOfflineStockMovement,
  queueReservedQuickPosSale,
  queueReservedTradeDraft,
  readActiveOfflineScope,
  type OfflinePaymentDisplay,
  type OfflinePaymentExpectedTarget,
  type OfflinePaymentRole,
  type OfflineProductDisplay,
  type OfflineStockDisplay,
} from "../../lib/offline-data";

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
  ok?: boolean;
};

export type HardwareApiResult<T> =
  | { data: T; ok: true }
  | { message: string; ok: false };

const inFlightMutations = new Map<string, Promise<HardwareApiResult<unknown>>>();

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

export async function postHardwareProductJson<T>(
  body: Record<string, unknown>,
  display: OfflineProductDisplay = {},
): Promise<HardwareApiResult<T>> {
  const offlineProduct = await queueOfflineProduct<T>(body, display);
  if (offlineProduct) return offlineProduct;
  return sendHardwareJson<T>("/api/hardware/products", "POST", body);
}

export async function postHardwareStockJson<T>(
  body: Record<string, unknown>,
  expectedCurrentStock: number,
  display: OfflineStockDisplay = {},
): Promise<HardwareApiResult<T>> {
  const offlineStock = await queueOfflineStock<T>(body, expectedCurrentStock, display);
  if (offlineStock) return offlineStock;
  return sendHardwareJson<T>("/api/hardware/inventory", "POST", body);
}

export async function postHardwarePartyPaymentJson<T>(
  role: OfflinePaymentRole,
  body: Record<string, unknown>,
  expectedTargets: OfflinePaymentExpectedTarget[],
  display: OfflinePaymentDisplay = {},
): Promise<HardwareApiResult<T>> {
  const offlinePayment = await queueOfflinePayment<T>(role, body, expectedTargets, display);
  if (offlinePayment) return offlinePayment;
  return sendHardwareJson<T>(
    role === "supplier"
      ? "/api/hardware/financial/supplier-payments"
      : "/api/hardware/financial/customer-payments",
    "POST",
    body,
  );
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
  const requestKey = hardwareMutationKey(endpoint, method, body);
  const existing = inFlightMutations.get(requestKey);
  if (existing) return existing as Promise<HardwareApiResult<T>>;

  const request = executeHardwareJson<T>(endpoint, method, body);
  inFlightMutations.set(requestKey, request as Promise<HardwareApiResult<unknown>>);
  try {
    return await request;
  } finally {
    if (inFlightMutations.get(requestKey) === request) {
      inFlightMutations.delete(requestKey);
    }
  }
}

async function executeHardwareJson<T>(
  endpoint: string,
  method: "PATCH" | "POST",
  body?: unknown,
): Promise<HardwareApiResult<T>> {
  const offlineCustomerBlock = blockOfflineCustomerCreation<T>(endpoint, method);
  if (offlineCustomerBlock) return offlineCustomerBlock;

  const offlineProductBlock = blockOfflineQuickProductCreation<T>(endpoint, method);
  if (offlineProductBlock) return offlineProductBlock;

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
    closeSuccessfulEstimateEditor(endpoint, method);
    return { data: result.data as T, ok: true };
  } catch {
    return {
      message: "The server could not be reached. Check the connection and retry.",
      ok: false,
    };
  }
}

function hardwareMutationKey(endpoint: string, method: "PATCH" | "POST", body: unknown) {
  let serializedBody = "";
  try {
    serializedBody = body === undefined ? "" : JSON.stringify(body);
  } catch {
    serializedBody = String(body);
  }
  return `${method}:${endpoint}:${serializedBody}`;
}

function closeSuccessfulEstimateEditor(endpoint: string, method: "PATCH" | "POST") {
  if (
    typeof window === "undefined" ||
    method !== "PATCH" ||
    !/^\/api\/hardware\/trade\/[^/]+\/estimate$/u.test(endpoint) ||
    !window.opener ||
    window.opener.closed
  ) {
    return;
  }

  try {
    if (window.opener.location.origin === window.location.origin) {
      window.opener.location.reload();
    }
  } catch {
    // The saved edit still closes even if the opener cannot be refreshed.
  }
  window.close();
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

function blockOfflineQuickProductCreation<T>(
  endpoint: string,
  method: "PATCH" | "POST",
): HardwareApiResult<T> | null {
  if (
    typeof navigator === "undefined" ||
    navigator.onLine ||
    method !== "POST" ||
    endpoint !== "/api/hardware/products/quick-add"
  ) {
    return null;
  }
  return {
    message: "Offline transactions require an existing synced product. Create the product from Catalog > Products, then use it after reconnect sync completes.",
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

async function queueOfflineProduct<T>(
  body: Record<string, unknown>,
  display: OfflineProductDisplay,
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
    const queued = await queueOfflineCatalogProduct(scope, body, display);
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.product.name,
        label: "Product",
      },
    }));
    return { data: queued.product as unknown as T, ok: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Product could not be saved to the offline queue.",
      ok: false,
    };
  }
}

async function queueOfflineStock<T>(
  body: Record<string, unknown>,
  expectedCurrentStock: number,
  display: OfflineStockDisplay,
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
    const queued = await queueOfflineStockMovement(scope, body, expectedCurrentStock, display);
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.movement.productName,
        label: "Stock movement",
      },
    }));
    return { data: queued.movement as unknown as T, ok: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Stock movement could not be saved to the offline queue.",
      ok: false,
    };
  }
}

async function queueOfflinePayment<T>(
  role: OfflinePaymentRole,
  body: Record<string, unknown>,
  expectedTargets: OfflinePaymentExpectedTarget[],
  display: OfflinePaymentDisplay,
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
    const queued = await queueOfflinePartyPayment(scope, role, body, expectedTargets, display);
    window.dispatchEvent(new CustomEvent("trustfirst:offline-queue-changed", {
      detail: {
        documentNumber: queued.payment.partyName,
        label: role === "supplier" ? "Supplier payment" : "Customer receipt",
      },
    }));
    return { data: queued.payment as unknown as T, ok: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Payment could not be saved to the offline queue.",
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
