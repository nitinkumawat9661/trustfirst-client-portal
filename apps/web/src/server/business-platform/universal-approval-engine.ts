import type {
  BusinessActorId,
  BusinessEntityId,
  BusinessExecutionContext,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type ApprovalDecision = "approved" | "rejected" | "changes_requested";

export type ApprovalStepMode = "any" | "all" | "ordered";

export type ApprovalRequest = {
  id: BusinessEntityId;
  entity: BusinessReference;
  requestedAt: Date;
  requestedBy: BusinessActorId;
  summary: string;
};

export type ApprovalWorkflowStep = {
  approverRole?: string;
  approverUserIds?: BusinessActorId[];
  level: number;
  mode: ApprovalStepMode;
  name: string;
  required: boolean;
};

export type ApprovalWorkflow = {
  description?: string;
  entityType: string;
  id: string;
  name: string;
  steps: ApprovalWorkflowStep[];
  version: number;
};

export type ApprovalHistoryEntry = {
  actorId: BusinessActorId;
  comments?: string;
  decidedAt: Date;
  decision: ApprovalDecision;
  level: number;
};

export type ApprovalEvaluation = {
  currentLevel: number;
  history: ApprovalHistoryEntry[];
  request: ApprovalRequest;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  validation: BusinessValidationResult;
};

export interface UniversalApprovalEngine {
  describeWorkflow(
    context: BusinessExecutionContext,
    entityType: string,
  ): Promise<ApprovalWorkflow | null>;
  validateRequest(
    context: BusinessExecutionContext,
    request: ApprovalRequest,
  ): Promise<BusinessValidationResult>;
  evaluate(
    context: BusinessExecutionContext,
    workflow: ApprovalWorkflow,
    request: ApprovalRequest,
    history: ApprovalHistoryEntry[],
  ): Promise<ApprovalEvaluation>;
}

