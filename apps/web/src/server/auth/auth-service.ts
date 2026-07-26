import type { PrismaClient } from "@trustfirst/database";
import { AppError } from "../domain/errors";
import { normalizeEmail } from "../security/sanitize";
import {
  createSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../security/passwords";
import type { RequestMetadata } from "../security/request-metadata";
import { LoginRateLimitService } from "./rate-limit-service";
import { PrismaAuthRepository } from "./auth-repository";
import { PrismaAuditService } from "./audit-service";
import type {
  AuthAttemptResult,
  AuthenticatedUser,
  SessionRotationResult,
} from "./types";
import type {
  AdminResetPasswordInput,
  ChangePasswordInput,
  CredentialsLoginInput,
  EmailVerificationConfirmInput,
  EmailVerificationRequestInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from "./schemas";
import { PrismaSessionRepository } from "./session-repository";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 30;
const LOGIN_RATE_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60_000;
const REMEMBER_ME_MAX_AGE_MS = 60 * 24 * 60 * 60_000;
const SESSION_ROTATION_INTERVAL_MS = 12 * 60 * 60_000;

export class AuthenticationService {
  private readonly audit: PrismaAuditService;
  private readonly authRepository: PrismaAuthRepository;
  private readonly limiter: LoginRateLimitService;
  private readonly sessionRepository: PrismaSessionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.audit = new PrismaAuditService(prisma);
    this.authRepository = new PrismaAuthRepository(prisma);
    this.limiter = new LoginRateLimitService(prisma);
    this.sessionRepository = new PrismaSessionRepository(prisma);
  }

  async authorizeCredentials(
    input: CredentialsLoginInput,
    request: RequestMetadata,
  ): Promise<AuthAttemptResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const rateLimitKey = `${request.ipAddress ?? "unknown"}:${normalizedEmail}`;

    try {
      await this.limiter.consume({
        action: "credentials_login",
        key: rateLimitKey,
        limit: LOGIN_RATE_LIMIT,
        windowMs: LOGIN_WINDOW_MS,
      });
    } catch {
      return { code: "rate_limited", ok: false };
    }

    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user?.passwordHash) {
      await this.recordLoginFailure(normalizedEmail, request, "invalid_credentials");
      return { code: "invalid_credentials", ok: false };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginFailure(normalizedEmail, request, "account_locked", user.id);
      return { code: "account_locked", ok: false };
    }

    if (["DISABLED", "SUSPENDED"].includes(user.status)) {
      await this.recordLoginFailure(normalizedEmail, request, "account_disabled", user.id);
      return { code: "account_disabled", ok: false };
    }

    if (!user.emailVerified) {
      await this.recordLoginFailure(normalizedEmail, request, "email_unverified", user.id);
      return { code: "email_unverified", ok: false };
    }

    const passwordValid = await verifyPassword(user.passwordHash, input.password);

    if (!passwordValid) {
      await this.authRepository.markFailedLogin(user.id, LOCKOUT_THRESHOLD, LOCKOUT_MINUTES);
      await this.recordLoginFailure(normalizedEmail, request, "invalid_credentials", user.id);
      return { code: "invalid_credentials", ok: false };
    }

    await this.authRepository.markSuccessfulLogin(user.id);
    await this.authRepository.recordLoginAttempt({
      deviceHash: hashToken(`${request.userAgent ?? ""}:${request.ipAddress ?? ""}`),
      email: normalizedEmail,
      ipAddress: request.ipAddress,
      success: true,
      tenantId: user.tenantMemberships[0]?.tenantId,
      userAgent: request.userAgent,
      userId: user.id,
    });
    await this.sessionRepository.upsertDeviceSession({
      deviceHash: hashToken(`${request.userAgent ?? ""}:${request.ipAddress ?? ""}`),
      ipAddress: request.ipAddress,
      label: request.userAgent?.slice(0, 120),
      tenantId: user.tenantMemberships[0]?.tenantId,
      userAgent: request.userAgent,
      userId: user.id,
    });
    await this.audit.record({
      action: "AUTH_LOGIN_SUCCESS",
      actorId: user.id,
      request,
      tenantId: user.tenantMemberships[0]?.tenantId,
    });

    return {
      ok: true,
      rememberMe: input.rememberMe,
      user: {
        activeTenantId: user.tenantMemberships[0]?.tenantId,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        name: user.name,
        permissions: this.permissionsFor(user),
        role: user.role,
        status: user.status,
      },
    };
  }

  async requestPasswordReset(input: PasswordResetRequestInput, request: RequestMetadata) {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      return { token: null };
    }

    const token = createSecureToken();
    await this.authRepository.createAuthToken({
      expiresAt: new Date(Date.now() + 60 * 60_000),
      tokenHash: hashToken(token),
      type: "PASSWORD_RESET",
      userId: user.id,
    });
    await this.audit.record({
      action: "AUTH_PASSWORD_RESET_REQUESTED",
      actorId: user.id,
      request,
      tenantId: user.tenantMemberships[0]?.tenantId,
    });

    return { token };
  }

  async requestEmailVerification(input: EmailVerificationRequestInput) {
    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user || user.emailVerified) {
      return { token: null };
    }

    const token = createSecureToken();
    await this.authRepository.createAuthToken({
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      tokenHash: hashToken(token),
      type: "EMAIL_VERIFICATION",
      userId: user.id,
    });

    return { token };
  }

  async confirmEmailVerification(
    input: EmailVerificationConfirmInput,
    request: RequestMetadata,
  ) {
    const token = await this.authRepository.findUsableToken(
      hashToken(input.token),
      "EMAIL_VERIFICATION",
    );

    if (!token) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "The email verification token is invalid or expired.",
        status: 400,
      });
    }

    await this.authRepository.verifyEmail(token.userId);
    await this.authRepository.consumeToken(token.id);
    await this.audit.record({
      action: "AUTH_EMAIL_VERIFIED",
      actorId: token.userId,
      request,
    });
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput, request: RequestMetadata) {
    const token = await this.authRepository.findUsableToken(
      hashToken(input.token),
      "PASSWORD_RESET",
    );

    if (!token) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "The password reset token is invalid or expired.",
        status: 400,
      });
    }

    await this.authRepository.updatePassword(token.userId, await hashPassword(input.password));
    await this.authRepository.consumeToken(token.id);
    await this.sessionRepository.revokeAllForUser(token.userId);
    await this.audit.record({
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      actorId: token.userId,
      request,
    });
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    request: RequestMetadata,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.passwordHash) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Password credentials are not enabled for this account.",
        status: 400,
      });
    }

    const currentValid = await verifyPassword(user.passwordHash, input.currentPassword);

    if (!currentValid) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect.",
        status: 401,
      });
    }

    await this.authRepository.updatePassword(userId, await hashPassword(input.newPassword));
    await this.audit.record({
      action: "AUTH_PASSWORD_CHANGED",
      actorId: userId,
      request,
    });
  }

  async adminResetPassword(
    actorId: string,
    tenantId: string,
    input: AdminResetPasswordInput,
    request: RequestMetadata,
  ) {
    if (actorId === input.userId) {
      throw new AppError({ code: "BAD_REQUEST", message: "Use change password for your own account.", status: 400 });
    }
    const [actorMembership, targetMembership] = await Promise.all([
      this.prisma.tenantMembership.findUnique({
        include: { role: { include: { permissions: { include: { permission: true } } } } },
        where: { tenantId_userId: { tenantId, userId: actorId } },
      }),
      this.prisma.tenantMembership.findUnique({
        select: { userId: true },
        where: { tenantId_userId: { tenantId, userId: input.userId } },
      }),
    ]);
    const actorPermissions = actorMembership?.role.permissions.map((entry) => entry.permission.key) ?? [];
    const roleKey = actorMembership?.role.key ?? "";
    const allowed = actorMembership?.status === "ACTIVE" && (
      actorPermissions.includes("*") ||
      actorPermissions.includes("auth.users.manage") ||
      roleKey.includes("admin") ||
      roleKey.includes("owner")
    );
    if (!allowed) {
      throw new AppError({ code: "FORBIDDEN", message: "You are not allowed to reset another user's password.", status: 403 });
    }
    if (!targetMembership) {
      throw new AppError({ code: "NOT_FOUND", message: "User is not a member of this tenant.", status: 404 });
    }
    await this.authRepository.updatePassword(input.userId, await hashPassword(input.temporaryPassword));
    await this.sessionRepository.revokeAllForUser(input.userId);
    await this.audit.record({
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      actorId,
      metadata: { targetUserId: input.userId },
      request,
      tenantId,
    });
  }

  async rotateSession(sessionToken: string): Promise<SessionRotationResult> {
    const session = await this.sessionRepository.findSession(sessionToken);

    if (!session || session.revokedAt || session.expires <= new Date()) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Session is not active.",
        status: 401,
      });
    }

    const lastRotation = session.rotatedAt ?? session.createdAt;
    const shouldRotate = Date.now() - lastRotation.getTime() >= SESSION_ROTATION_INTERVAL_MS;
    const maxAge = session.rememberMe ? REMEMBER_ME_MAX_AGE_MS : SESSION_MAX_AGE_MS;
    const expires = new Date(Date.now() + maxAge);

    if (!shouldRotate) {
      return { expires: session.expires, rotated: false };
    }

    await this.sessionRepository.rotateSession(sessionToken, expires);
    return { expires, rotated: true };
  }

  async refreshJwtSession(userId: string): Promise<SessionRotationResult> {
    const user = await this.prisma.user.findUnique({
      select: {
        status: true,
      },
      where: { id: userId },
    });

    if (!user || ["DISABLED", "SUSPENDED", "LOCKED"].includes(user.status)) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Session is not active.",
        status: 401,
      });
    }

    return {
      expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
      rotated: true,
    };
  }

  async logoutAllDevices(userId: string, request: RequestMetadata) {
    await this.sessionRepository.revokeAllForUser(userId);
    await this.audit.record({
      action: "AUTH_LOGOUT_ALL_DEVICES",
      actorId: userId,
      request,
    });
  }

  private permissionsFor(user: Awaited<ReturnType<PrismaAuthRepository["findUserByEmail"]>>) {
    return [
      ...new Set(
        user?.tenantMemberships.flatMap((membership) =>
          membership.role.permissions.map((entry) => entry.permission.key),
        ) ?? [],
      ),
    ] as AuthenticatedUser["permissions"];
  }

  private async recordLoginFailure(
    email: string,
    request: RequestMetadata,
    failureCode: string,
    userId?: string,
  ) {
    await this.authRepository.recordLoginAttempt({
      deviceHash: hashToken(`${request.userAgent ?? ""}:${request.ipAddress ?? ""}`),
      email,
      failureCode,
      ipAddress: request.ipAddress,
      success: false,
      userAgent: request.userAgent,
      userId,
    });
    await this.audit.record({
      action: "AUTH_LOGIN_FAILURE",
      actorId: userId,
      metadata: { failureCode },
      request,
    });
  }
}
