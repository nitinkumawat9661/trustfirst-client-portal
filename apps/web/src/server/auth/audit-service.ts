import type { AuditAction, Prisma, PrismaClient } from "@trustfirst/database";
import type { RequestMetadata } from "../security/request-metadata";

export class PrismaAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: {
    action: AuditAction;
    actorId?: string | undefined;
    metadata?: Prisma.InputJsonValue | undefined;
    request?: RequestMetadata | undefined;
    targetId?: string | undefined;
    targetType?: string | undefined;
    tenantId?: string | undefined;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        action: input.action,
        metadata: input.metadata ?? {},
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.request?.correlationId
          ? { correlationId: input.request.correlationId }
          : {}),
        ...(input.request?.ipAddress ? { ipAddress: input.request.ipAddress } : {}),
        ...(input.targetId ? { targetId: input.targetId } : {}),
        ...(input.targetType ? { targetType: input.targetType } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.request?.userAgent ? { userAgent: input.request.userAgent } : {}),
      },
    });
  }
}
