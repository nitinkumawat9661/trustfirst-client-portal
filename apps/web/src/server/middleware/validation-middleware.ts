import type { RequestValidationSchemas } from "../validation/validate";
import { validateRequest } from "../validation/validate";
import type { ApiMiddleware } from "./types";

export function withValidation(schemas: RequestValidationSchemas): ApiMiddleware {
  return async (context, next) => {
    await validateRequest(context.request, schemas);

    return next(context);
  };
}
