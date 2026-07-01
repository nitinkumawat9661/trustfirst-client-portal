import type { AuthorizationPolicy, Permission } from "../authorization/authorization";
import type { PlatformReference, PlatformServiceContext } from "./common";

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export type PermissionEvaluationInput = {
  policy: AuthorizationPolicy;
  target?: PlatformReference;
};

export interface PermissionService {
  evaluate(
    context: PlatformServiceContext,
    input: PermissionEvaluationInput,
  ): Promise<PermissionDecision>;
  listEffectivePermissions(
    context: PlatformServiceContext,
    actorId: string,
  ): Promise<Permission[]>;
}
