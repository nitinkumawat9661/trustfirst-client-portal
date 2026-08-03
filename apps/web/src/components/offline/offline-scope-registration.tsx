"use client";

import { useEffect } from "react";
import { registerActiveOfflineScope, type OfflineDataScope } from "@/lib/offline-data";

export function OfflineScopeRegistration({ scope }: { scope: OfflineDataScope }) {
  const { tenantId, userId } = scope;

  useEffect(() => {
    registerActiveOfflineScope({ tenantId, userId });
  }, [tenantId, userId]);

  return null;
}
