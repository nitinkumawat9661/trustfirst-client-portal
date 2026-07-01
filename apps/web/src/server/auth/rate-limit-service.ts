import type { PrismaClient } from "@trustfirst/database";
import { AppError } from "../domain/errors";

export class LoginRateLimitService {
  constructor(private readonly prisma: PrismaClient) {}

  async consume(input: {
    action: string;
    key: string;
    limit: number;
    tenantId?: string | undefined;
    windowMs: number;
  }) {
    const now = new Date();
    const existing = await this.prisma.rateLimitEvent.findUnique({
      where: {
        key_action: {
          action: input.action,
          key: input.key,
        },
      },
    });

    if (!existing || existing.resetAt <= now) {
      await this.prisma.rateLimitEvent.upsert({
        create: {
          action: input.action,
          count: 1,
          key: input.key,
          resetAt: new Date(Date.now() + input.windowMs),
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        },
        update: {
          count: 1,
          resetAt: new Date(Date.now() + input.windowMs),
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        },
        where: {
          key_action: {
            action: input.action,
            key: input.key,
          },
        },
      });
      return;
    }

    if (existing.count >= input.limit) {
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Too many authentication attempts. Try again later.",
        status: 429,
      });
    }

    await this.prisma.rateLimitEvent.update({
      data: {
        count: {
          increment: 1,
        },
      },
      where: {
        key_action: {
          action: input.action,
          key: input.key,
        },
      },
    });
  }
}
