import type { PlatformLifecycleState, PlatformServiceContext } from "./common";

export type TenantDescriptor = {
  id: string;
  lifecycleState: PlatformLifecycleState;
  name: string;
  slug: string;
};

export type TenantResolutionInput = {
  host?: string;
  tenantId?: string;
  tenantSlug?: string;
};

export interface TenantService {
  describeTenant(
    context: PlatformServiceContext,
    tenantId: string,
  ): Promise<TenantDescriptor | null>;
  resolveTenant(input: TenantResolutionInput): Promise<TenantDescriptor | null>;
}
