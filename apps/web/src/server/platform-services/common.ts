import type { Permission } from "../authorization/authorization";

export type PlatformServiceContext = {
  actorId?: string;
  requestId: string;
  tenantId: string;
};

export type PlatformServiceResult<TValue> = {
  value: TValue;
  warnings?: string[];
};

export type PlatformActor = {
  id: string;
  displayName?: string;
  email?: string;
  permissions: Permission[];
  role: string;
  tenantId: string;
};

export type PlatformReference = {
  id: string;
  type: string;
};

export type PlatformScope = {
  tenantId: string;
  clientId?: string;
  engagementId?: string;
  projectId?: string;
};

export type PlatformLifecycleState =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type PlatformVisibility =
  | "internal"
  | "client"
  | "restricted"
  | "public_link";
