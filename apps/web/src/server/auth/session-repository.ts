import type { PrismaClient } from "@trustfirst/database";

export class PrismaSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findSession(sessionToken: string) {
    return this.prisma.session.findUnique({
      include: {
        user: true,
      },
      where: { sessionToken },
    });
  }

  rotateSession(sessionToken: string, expires: Date) {
    return this.prisma.session.update({
      data: {
        expires,
        rotatedAt: new Date(),
      },
      where: { sessionToken },
    });
  }

  revokeSession(sessionToken: string) {
    return this.prisma.session.update({
      data: {
        revokedAt: new Date(),
      },
      where: { sessionToken },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.user.update({
      data: {
        sessionVersion: {
          increment: 1,
        },
      },
      where: { id: userId },
    });

    await this.prisma.session.updateMany({
      data: {
        revokedAt: new Date(),
      },
      where: {
        userId,
        revokedAt: null,
      },
    });

    await this.prisma.deviceSession.updateMany({
      data: {
        revokedAt: new Date(),
      },
      where: {
        userId,
        revokedAt: null,
      },
    });
  }

  upsertDeviceSession(input: {
    deviceHash: string;
    ipAddress?: string | undefined;
    label?: string | undefined;
    sessionId?: string | undefined;
    tenantId?: string | undefined;
    userAgent?: string | undefined;
    userId: string;
  }) {
    return this.prisma.deviceSession.upsert({
      create: {
        deviceHash: input.deviceHash,
        userId: input.userId,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.label ? { label: input.label } : {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
      update: {
        lastSeenAt: new Date(),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.label ? { label: input.label } : {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
      where: {
        userId_deviceHash: {
          deviceHash: input.deviceHash,
          userId: input.userId,
        },
      },
    });
  }
}
