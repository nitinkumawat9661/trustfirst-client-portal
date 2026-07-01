import type {
  BusinessExecutionContext,
  BusinessReference,
  BusinessValidationResult,
} from "./common";

export type StatusCategory =
  | "draft"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled"
  | "archived"
  | "custom";

export type StatusDescriptor = {
  category: StatusCategory;
  colorToken?: string;
  description?: string;
  id: string;
  isFinal: boolean;
  label: string;
  sortOrder: number;
};

export type StatusTransitionRule = {
  description?: string;
  fromStatusId: string;
  requiresApproval: boolean;
  requiredPermission?: string;
  toStatusId: string;
};

export type StatusTransitionRequest = {
  entity: BusinessReference;
  fromStatusId: string;
  reason?: string;
  toStatusId: string;
};

export type StatusTransitionResult = {
  appliedAt?: Date;
  entity: BusinessReference;
  status: StatusDescriptor;
  validation: BusinessValidationResult;
};

export interface UniversalStatusEngine {
  describeStatuses(
    context: BusinessExecutionContext,
    entityType: string,
  ): Promise<StatusDescriptor[]>;
  describeTransitions(
    context: BusinessExecutionContext,
    entityType: string,
  ): Promise<StatusTransitionRule[]>;
  validateTransition(
    context: BusinessExecutionContext,
    request: StatusTransitionRequest,
  ): Promise<BusinessValidationResult>;
}

