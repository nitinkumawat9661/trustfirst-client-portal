export type EntityId = string;

export type DomainEntity<TId extends EntityId = EntityId> = {
  id: TId;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantScoped = {
  tenantId: string;
};

export type DomainEvent<TPayload = Record<string, unknown>> = {
  id: string;
  name: string;
  occurredAt: Date;
  tenantId?: string;
  payload: TPayload;
};
