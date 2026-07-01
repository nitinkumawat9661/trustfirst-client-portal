import type { ApiMiddleware } from "./types";

export const requestLogger: ApiMiddleware = async (context, next) => {
  const response = await next(context);
  const durationMs = Date.now() - context.startedAt;

  console.info(
    JSON.stringify({
      durationMs,
      level: "info",
      method: context.request.method,
      path: context.request.nextUrl.pathname,
      requestId: context.requestId,
      status: response.status,
      tenantId: context.tenant.id,
    }),
  );

  return response;
};
