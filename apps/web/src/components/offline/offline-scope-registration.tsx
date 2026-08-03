"use client";

import { useEffect } from "react";
import { registerActiveOfflineScope, type OfflineDataScope } from "@/lib/offline-data";

export function OfflineScopeRegistration({ scope }: { scope: OfflineDataScope }) {
  useEffect(() => {
    registerActiveOfflineScope(scope);
  }, [scope.tenantId, scope.userId]);
  return null;
}
