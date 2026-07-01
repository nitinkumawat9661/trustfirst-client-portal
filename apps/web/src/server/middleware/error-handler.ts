import type { ApiContext } from "../api/context";
import { fail } from "../api/response";
import { isAppError } from "../domain/errors";

export function handleApiError(error: unknown, context: ApiContext) {
  if (isAppError(error)) {
    return fail(
      {
        code: error.code,
        details: error.details,
        message: error.message,
      },
      {
        requestId: context.requestId,
        status: error.status,
      },
    );
  }

  console.error(
    JSON.stringify({
      error,
      level: "error",
      message: "Unhandled API error",
      requestId: context.requestId,
      tenantId: context.tenant.id,
    }),
  );

  return fail(
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
    {
      requestId: context.requestId,
      status: 500,
    },
  );
}
