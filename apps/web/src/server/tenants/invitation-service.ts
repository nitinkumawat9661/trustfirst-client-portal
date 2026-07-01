import type { PrismaClient } from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { createSecureToken, hashToken } from "../security/passwords";
import { normalizeEmail } from "../security/sanitize";

export class TenantInvitationService {
  constructor(private readonly prisma: PrismaClient) {}

  async createInvitation(input: {
    email: string;
    invitedById: string;
    roleId: string;
    tenantId: string;
  }) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.invitedById,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Only tenant members can issue invitations.",
        status: 403,
      });
    }

    const token = createSecureToken();
    const invitation = await this.prisma.tenantInvitation.create({
      data: {
        email: input.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        invitedById: input.invitedById,
        normalizedEmail: normalizeEmail(input.email),
        roleId: input.roleId,
        tenantId: input.tenantId,
        tokenHash: hashToken(token),
      },
    });

    return { invitation, token };
  }

  async acceptInvitation(input: { token: string; userId: string }) {
    const invitation = await this.prisma.tenantInvitation.findFirst({
      where: {
        expiresAt: { gt: new Date() },
        status: "PENDING",
        tokenHash: hashToken(input.token),
      },
    });

    if (!invitation) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "The invitation is invalid or expired.",
        status: 400,
      });
    }

    await this.prisma.$transaction([
      this.prisma.tenantMembership.upsert({
        create: {
          invitedAt: invitation.createdAt,
          joinedAt: new Date(),
          roleId: invitation.roleId,
          status: "ACTIVE",
          tenantId: invitation.tenantId,
          userId: input.userId,
        },
        update: {
          joinedAt: new Date(),
          roleId: invitation.roleId,
          status: "ACTIVE",
        },
        where: {
          tenantId_userId: {
            tenantId: invitation.tenantId,
            userId: input.userId,
          },
        },
      }),
      this.prisma.tenantInvitation.update({
        data: {
          acceptedAt: new Date(),
          status: "ACCEPTED",
        },
        where: { id: invitation.id },
      }),
    ]);
  }
}

