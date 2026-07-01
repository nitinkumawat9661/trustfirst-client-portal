import type { DomainEntity, EntityId, TenantScoped } from "../domain/entity";

export type RepositoryScope = TenantScoped;

export type FindByIdArgs<TId extends EntityId = EntityId> = RepositoryScope & {
  id: TId;
};

export interface Repository<TEntity extends DomainEntity, TId extends EntityId = EntityId> {
  findById(args: FindByIdArgs<TId>): Promise<TEntity | null>;
  exists(args: FindByIdArgs<TId>): Promise<boolean>;
}
