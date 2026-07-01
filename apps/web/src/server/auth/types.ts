import type { Permission } from "../authorization/authorization";

export type AuthenticatedUser = {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  role: "ADMIN" | "CLIENT";
  status: string;
  permissions: Permission[];
  activeTenantId?: string | undefined;
};

export type AuthFailureCode =
  | "invalid_credentials"
  | "email_unverified"
  | "account_locked"
  | "account_disabled"
  | "rate_limited";

export type AuthAttemptResult =
  | { ok: true; user: AuthenticatedUser; rememberMe: boolean }
  | { ok: false; code: AuthFailureCode };

export type SessionRotationResult = {
  expires: Date;
  rotated: boolean;
};
