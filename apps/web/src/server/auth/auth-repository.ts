import type { Prisma, PrismaClient } from "@trustfirst/database";

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    tenantMemberships: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
        tenant: true;
      };
    };
  };
}>;

export class PrismaAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(normalizedEmail: string) {
    return this.prisma.user.findUnique({
      include: {
        tenantMemberships: {
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
            tenant: true,
          },
          where: {
            status: "ACTIVE",
            tenant: {
              status: {
                in: ["ACTIVE", "TRIAL"],
              },
            },
          },
        },
      },
      where: { normalizedEmail },
    });
  }

  async recordLoginAttempt(input: {
    deviceHash?: string | undefined;
    email: string;
    failureCode?: string | undefined;
    ipAddress?: string | undefined;
    success: boolean;
    tenantId?: string | undefined;
    userAgent?: string | undefined;
    userId?: string | undefined;
  }) {
    await this.prisma.loginHistory.create({
      data: {
        email: input.email,
        success: input.success,
        ...(input.deviceHash ? { deviceHash: input.deviceHash } : {}),
        ...(input.failureCode ? { failureCode: input.failureCode } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      },
    });
  }

  markSuccessfulLogin(userId: string) {
    return this.prisma.user.update({
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date(),
        lockedUntil: null,
      },
      where: { id: userId },
    });
  }

  async markFailedLogin(userId: string, lockoutThreshold: number, lockoutMinutes: number) {
    const user = await this.prisma.user.update({
      data: {
        failedLoginCount: {
          increment: 1,
        },
      },
      where: { id: userId },
    });

    if (user.failedLoginCount >= lockoutThreshold) {
      await this.prisma.user.update({
        data: {
          lockedUntil: new Date(Date.now() + lockoutMinutes * 60_000),
          status: "LOCKED",
        },
        where: { id: userId },
      });
    }
  }

  createAuthToken(input: {
    expiresAt: Date;
    tokenHash: string;
    type: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "SESSION_REFRESH";
    userId: string;
  }) {
    return this.prisma.authToken.create({ data: input });
  }

  findUsableToken(tokenHash: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
    return this.prisma.authToken.findFirst({
      include: { user: true },
      where: {
        expiresAt: { gt: new Date() },
        tokenHash,
        type,
        usedAt: null,
      },
    });
  }

  async consumeToken(tokenId: string) {
    await this.prisma.authToken.update({
      data: { usedAt: new Date() },
      where: { id: tokenId },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
        passwordHash,
        status: "ACTIVE",
      },
      where: { id: userId },
    });
  }

  verifyEmail(userId: string) {
    return this.prisma.user.update({
      data: {
        emailVerified: new Date(),
        status: "ACTIVE",
      },
      where: { id: userId },
    });
  }
}
