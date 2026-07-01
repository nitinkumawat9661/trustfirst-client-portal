import type {
  BusinessActorId,
  BusinessEntityId,
  BusinessTenantId,
} from "./common";

export interface BaseEntity<TId extends BusinessEntityId = BusinessEntityId> {
  id: TId;
  tenantId: BusinessTenantId;
}

export interface AuditableEntity<
  TId extends BusinessEntityId = BusinessEntityId,
> extends BaseEntity<TId> {
  createdAt: Date;
  createdBy: BusinessActorId;
  updatedAt: Date;
  updatedBy?: BusinessActorId;
}

export interface SoftDeleteEntity<
  TId extends BusinessEntityId = BusinessEntityId,
> extends AuditableEntity<TId> {
  deletedAt?: Date;
  deletedBy?: BusinessActorId;
  deletionReason?: string;
  isDeleted: boolean;
}

export interface VersionedEntity<
  TId extends BusinessEntityId = BusinessEntityId,
> extends AuditableEntity<TId> {
  version: number;
  versionLabel?: string;
}

export type UniversalEntity<TId extends BusinessEntityId = BusinessEntityId> =
  BaseEntity<TId> &
    Partial<AuditableEntity<TId>> &
    Partial<SoftDeleteEntity<TId>> &
    Partial<VersionedEntity<TId>>;

export type EntityDescriptor = {
  displayName: string;
  entityType: string;
  searchable: boolean;
  tenantScoped: boolean;
  versioned: boolean;
};

