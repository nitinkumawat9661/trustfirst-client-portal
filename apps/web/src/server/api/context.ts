import type { NextRequest } from "next/server";
import type { Permission } from "../authorization/authorization";
import type { TenantContext } from "../tenant/tenant-resolver";

export type Principal = {
  id: string;
  role: string;
  permissions: Permission[];
};

export type ApiContext = {
  request: NextRequest;
  requestId: string;
  startedAt: number;
  tenant: TenantContext;
  principal?: Principal;
  audit: {
    events: Array<{
      action: string;
      target?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
};

export function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
