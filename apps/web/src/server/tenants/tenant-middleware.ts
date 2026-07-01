import { getPrisma } from "@trustfirst/database";
import type { ApiMiddleware } from "../middleware/types";
import { TenantApplicationService } from "./tenant-service";

export function tenantMembershipMiddleware(): ApiMiddleware {
  return async (context, next) => {
    if (!context.principal) {
      return next(context);
    }

    const service = new TenantApplicationService(getPrisma());
    const tenantContext = await service.resolveForUser(
      context.principal.id,
      context.tenant.id,
    );

    context.tenant = {
      id: tenantContext.activeTenant.id,
      source: "header",
    };

    return next(context);
  };
}

