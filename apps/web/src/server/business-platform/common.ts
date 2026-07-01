export type BusinessEntityId = string;

export type BusinessTenantId = string;

export type BusinessActorId = string;

export type BusinessReference = {
  id: BusinessEntityId;
  type: string;
};

export type BusinessScope = {
  tenantId: BusinessTenantId;
  clientId?: BusinessEntityId;
  projectId?: BusinessEntityId;
  workspaceId?: BusinessEntityId;
};

export type BusinessExecutionContext = {
  actorId?: BusinessActorId;
  correlationId: string;
  scope: BusinessScope;
};

export type BusinessValidationIssue = {
  code: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

export type BusinessValidationResult = {
  issues: BusinessValidationIssue[];
  valid: boolean;
};

