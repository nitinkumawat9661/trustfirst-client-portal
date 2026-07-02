export type CommercialTenantId = string;

export type CommercialActorId = string;

export type CommercialEntityRef = {
  id: string;
  type: string;
};

export type CommercialScope = {
  tenantId: CommercialTenantId;
  clientId?: string;
  projectId?: string;
};

export type CommercialContext = {
  actorId?: CommercialActorId;
  correlationId: string;
  scope: CommercialScope;
};

export type CommercialValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type CommercialValidationResult = {
  issues: CommercialValidationIssue[];
  valid: boolean;
};

export type JsonRecord = Record<string, unknown>;

