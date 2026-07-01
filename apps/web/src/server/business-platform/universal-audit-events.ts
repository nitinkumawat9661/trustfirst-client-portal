import type {
  BusinessActorId,
  BusinessEntityId,
  BusinessReference,
  BusinessScope,
} from "./common";

export type AuditEventAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "restore"
  | "export"
  | "import"
  | "approve"
  | "reject"
  | "status_transition"
  | "system";

export type AuditEventRiskLevel = "low" | "medium" | "high" | "critical";

export type AuditEventContract = {
  action: AuditEventAction;
  actorId?: BusinessActorId;
  entity?: BusinessReference;
  id: BusinessEntityId;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  riskLevel: AuditEventRiskLevel;
  scope: BusinessScope;
};

export type AuditEventPolicy = {
  action: AuditEventAction;
  immutable: boolean;
  retentionDays: number;
  requiresReason: boolean;
};

export interface UniversalAuditEventContracts {
  describePolicy(action: AuditEventAction): AuditEventPolicy;
  normalizeEvent(event: AuditEventContract): AuditEventContract;
}

