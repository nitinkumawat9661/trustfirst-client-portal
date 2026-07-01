import { getEventBus } from "../events/event-bus";
import type { ApiMiddleware } from "./types";

export const auditMiddleware: ApiMiddleware = async (context, next) => {
  const response = await next(context);

  if (context.audit.events.length > 0) {
    const eventBus = getEventBus();

    await Promise.all(
      context.audit.events.map((event) =>
        eventBus.publish({
          id: `${context.requestId}:${event.action}`,
          name: `audit.${event.action}`,
          occurredAt: new Date(),
          payload: {
            metadata: event.metadata ?? {},
            requestId: context.requestId,
            target: event.target,
          },
          tenantId: context.tenant.id,
        }),
      ),
    );
  }

  return response;
};
