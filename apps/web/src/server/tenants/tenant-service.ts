import type { PrismaClient } from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { PrismaAuditService } from "../auth/audit-service";
import type { RequestMetadata } from "../security/request-metadata";
import { PrismaTenantRepository } from "./tenant-repository";
import type {
  TenantEntity,
  TenantMembershipEntity,
  TenantRequestContext,
} from "./types";

export class TenantApplicationService {
  private readonly audit: PrismaAuditService;
  private readonly repository: PrismaTenantRepository;

  constructor(prisma: PrismaClient) {
    this.audit = new PrismaAuditService(prisma);
    this.repository = new PrismaTenantRepository(prisma);
  }

  async resolveForUser(userId: string, requestedTenantId?: string): Promise<TenantRequestContext> {
    const memberships = await this.repository.listMemberships(userId);

    if (memberships.length === 0) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "No active tenant membership was found.",
        status: 403,
      });
    }

    const activeMembership =
      memberships.find((membership) => membership.tenantId === requestedTenantId) ??
      memberships[0];

    if (!activeMembership) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "No active tenant membership was found.",
        status: 403,
      });
    }

    return {
      activeTenant: mapTenant(activeMembership.tenant),
      memberships: memberships.map(mapMembership),
    };
  }

  async switchTenant(input: {
    request: RequestMetadata;
    sessionToken: string;
    tenantId: string;
    userId: string;
  }) {
    const membership = await this.repository.findMembership(input.userId, input.tenantId);

    if (!membership || membership.status !== "ACTIVE") {
      await this.audit.record({
        action: "PERMISSION_DENIED",
        actorId: input.userId,
        metadata: { reason: "tenant_membership_missing", tenantId: input.tenantId },
        request: input.request,
        tenantId: input.tenantId,
      });
      throw new AppError({
        code: "FORBIDDEN",
        message: "You do not have access to this tenant.",
        status: 403,
      });
    }

    if (!["ACTIVE", "TRIAL"].includes(membership.tenant.status)) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Tenant is not active.",
        status: 403,
      });
    }

    await this.repository.updateActiveTenant(input.sessionToken, input.tenantId);
    await this.audit.record({
      action: "TENANT_SWITCHED",
      actorId: input.userId,
      request: input.request,
      tenantId: input.tenantId,
    });

    return mapTenant(membership.tenant);
  }
}

function mapTenant(tenant: {
  branding: unknown;
  id: string;
  name: string;
  primaryDomain: string | null;
  settings: unknown;
  slug: string;
  status: string;
}): TenantEntity {
  return {
    branding: tenant.branding as TenantEntity["branding"],
    id: tenant.id,
    name: tenant.name,
    primaryDomain: tenant.primaryDomain,
    settings: tenant.settings as TenantEntity["settings"],
    slug: tenant.slug,
    status: tenant.status as TenantEntity["status"],
  };
}

function mapMembership(membership: {
  id: string;
  role: { id: string; key: string };
  status: string;
  tenant: Parameters<typeof mapTenant>[0];
  userId: string;
}): TenantMembershipEntity {
  return {
    id: membership.id,
    roleId: membership.role.id,
    roleKey: membership.role.key,
    status: membership.status as TenantMembershipEntity["status"],
    tenant: mapTenant(membership.tenant),
    userId: membership.userId,
  };
}
