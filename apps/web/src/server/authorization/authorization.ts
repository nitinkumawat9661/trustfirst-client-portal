import type { ApiContext, Principal } from "../api/context";
import { AppError } from "../domain/errors";

export type Permission = `${string}.${string}` | "*";

export type AuthorizationPolicy = {
  anyOf?: Permission[];
  allOf?: Permission[];
};

export function authorize(context: ApiContext, policy: AuthorizationPolicy) {
  const principal = context.principal;

  if (!principal) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Authentication is required.",
      status: 401,
    });
  }

  if (!isAuthorized(principal, policy)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
      status: 403,
    });
  }
}

export function isAuthorized(
  principal: Principal,
  { allOf = [], anyOf = [] }: AuthorizationPolicy,
) {
  if (principal.permissions.includes("*")) {
    return true;
  }

  const hasAll = allOf.every((permission) =>
    principal.permissions.includes(permission),
  );
  const hasAny =
    anyOf.length === 0 ||
    anyOf.some((permission) => principal.permissions.includes(permission));

  return hasAll && hasAny;
}
