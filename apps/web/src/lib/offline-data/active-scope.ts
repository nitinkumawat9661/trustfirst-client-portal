import type { OfflineDataScope } from "./types";

const activeScopeKey = "trustfirst.activeOfflineScope.v1";

export function registerActiveOfflineScope(scope: OfflineDataScope) {
  if (typeof window === "undefined") return;
  assertScope(scope);
  window.localStorage.setItem(activeScopeKey, JSON.stringify(scope));
}

export function readActiveOfflineScope(): OfflineDataScope | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(activeScopeKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OfflineDataScope>;
    if (typeof parsed.tenantId !== "string" || typeof parsed.userId !== "string") return null;
    const scope = { tenantId: parsed.tenantId, userId: parsed.userId };
    assertScope(scope);
    return scope;
  } catch {
    return null;
  }
}

function assertScope(scope: OfflineDataScope) {
  if (!scope.tenantId.trim() || !scope.userId.trim()) {
    throw new Error("Offline tenant and user scope cannot be empty.");
  }
}
