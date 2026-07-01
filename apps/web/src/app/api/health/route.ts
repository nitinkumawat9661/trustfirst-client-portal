import { ok } from "@/server/api/response";
import { createApiRoute } from "@/server/api/route-handler";
import { auditMiddleware } from "@/server/middleware/audit-middleware";
import { rateLimiter } from "@/server/middleware/rate-limiter";
import { requestLogger } from "@/server/middleware/request-logger";

export const GET = createApiRoute(
  async (context) => {
    context.audit.events.push({
      action: "health.checked",
      target: "api.health",
    });

    return ok(
      {
        service: "trustfirst-client-portal",
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      { requestId: context.requestId },
    );
  },
  {
    middlewares: [
      rateLimiter({ limit: 60, windowMs: 60_000 }),
      requestLogger,
      auditMiddleware,
    ],
  },
);
