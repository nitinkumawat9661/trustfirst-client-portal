import type { AuthorizationPolicy } from "../authorization/authorization";
import { authorize } from "../authorization/authorization";
import type { ApiMiddleware } from "./types";

export function withAuthorization(policy: AuthorizationPolicy): ApiMiddleware {
  return async (context, next) => {
    authorize(context, policy);

    return next(context);
  };
}
