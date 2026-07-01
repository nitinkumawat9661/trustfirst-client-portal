import type { PlatformReference, PlatformServiceContext } from "./common";

export type AuditRecordInput = {
  action: string;
  metadata?: Record<string, unknown>;
  target?: PlatformReference;
};

export type AuditRecord = AuditRecordInput & {
  id: string;
  occurredAt: Date;
  requestId: string;
  tenantId: string;
};

export interface AuditService {
  record(context: PlatformServiceContext, input: AuditRecordInput): Promise<void>;
  preview(input: AuditRecordInput): AuditRecordInput;
}
