import type { NextRequest } from "next/server";
import { createRequestId, type ApiContext } from "./context";
import { fail } from "./response";
import type { ApiMiddleware, ApiRouteHandler } from "../middleware/types";
import { handleApiError } from "../middleware/error-handler";
import { resolveTenant } from "../tenant/tenant-resolver";

export type ApiRouteOptions = {
  middlewares?: ApiMiddleware[];
};

export function createApiRoute(
  handler: ApiRouteHandler,
  options: ApiRouteOptions = {},
) {
  return async function apiRoute(request: NextRequest) {
    const requestId = createRequestId();
    const context: ApiContext = {
      audit: { events: [] },
      request,
      requestId,
      startedAt: Date.now(),
      tenant: resolveTenant(request),
    };
    const stack = options.middlewares ?? [];

    try {
      const runner = stack.reduceRight<ApiRouteHandler>(
        (next, middleware) => {
          return (currentContext) => middleware(currentContext, next);
        },
        handler,
      );

      return await runner(context);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

export function methodNotAllowed(request: NextRequest) {
  const requestId = createRequestId();

  return fail(
    {
      code: "BAD_REQUEST",
      message: `${request.method} is not supported for this endpoint.`,
    },
    { requestId, status: 405 },
  );
}
