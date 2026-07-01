import type { PrismaClient } from "@trustfirst/database";

export class PrismaTenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  findByDomain(primaryDomain: string) {
    return this.prisma.tenant.findFirst({ where: { primaryDomain } });
  }

  listMemberships(userId: string) {
    return this.prisma.tenantMembership.findMany({
      include: {
        role: true,
        tenant: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        status: "ACTIVE",
        tenant: {
          status: {
            in: ["ACTIVE", "TRIAL"],
          },
        },
        userId,
      },
    });
  }

  findMembership(userId: string, tenantId: string) {
    return this.prisma.tenantMembership.findUnique({
      include: {
        role: true,
        tenant: true,
      },
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
  }

  updateActiveTenant(sessionToken: string, tenantId: string) {
    return this.prisma.session.update({
      data: {
        activeTenantId: tenantId,
      },
      where: {
        sessionToken,
      },
    });
  }
}

