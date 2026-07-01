import type { PrismaClient } from "@trustfirst/database";
import type { AuthorizationPolicy, Permission } from "../authorization/authorization";
import { isAuthorized } from "../authorization/authorization";
import { AppError } from "../domain/errors";

type PermissionCacheEntry = {
  expiresAt: number;
  permissions: Permission[];
  roleKey: string;
};

const CACHE_TTL_MS = 60_000;

export class PermissionResolverService {
  private readonly cache = new Map<string, PermissionCacheEntry>();

  constructor(private readonly prisma: PrismaClient) {}

  async resolveForMembership(userId: string, tenantId: string) {
    const cacheKey = `${tenantId}:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "No active membership was found for this tenant.",
        status: 403,
      });
    }

    const entry = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      permissions: membership.role.permissions.map(
        (permission) => permission.permission.key as Permission,
      ),
      roleKey: membership.role.key,
    };

    this.cache.set(cacheKey, entry);
    return entry;
  }

  async resolveRole(userId: string, tenantId: string) {
    const resolved = await this.resolveForMembership(userId, tenantId);

    return {
      key: resolved.roleKey,
      permissions: resolved.permissions,
    };
  }

  async enforce(input: {
    policy: AuthorizationPolicy;
    tenantId: string;
    userId: string;
  }) {
    const resolved = await this.resolveForMembership(input.userId, input.tenantId);

    if (
      !isAuthorized(
        {
          id: input.userId,
          permissions: resolved.permissions,
          role: resolved.roleKey,
        },
        input.policy,
      )
    ) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
        status: 403,
      });
    }

    return resolved;
  }

  validateOwnership(input: {
    ownerId?: string | null;
    resourceTenantId?: string | null;
    tenantId: string;
    userId: string;
  }) {
    if (input.resourceTenantId && input.resourceTenantId !== input.tenantId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "The requested resource belongs to another tenant.",
        status: 403,
      });
    }

    if (input.ownerId && input.ownerId !== input.userId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "The requested resource belongs to another user.",
        status: 403,
      });
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
