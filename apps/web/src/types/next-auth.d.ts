import type { DefaultSession } from "next-auth";
import type { Permission } from "@/server/authorization/authorization";

declare module "next-auth" {
  interface Session {
    user: {
      activeTenantId?: string | undefined;
      id: string;
      permissions?: Permission[] | undefined;
      role?: "ADMIN" | "CLIENT" | undefined;
    } & DefaultSession["user"];
  }

  interface User {
    activeTenantId?: string | undefined;
    permissions: Permission[];
    rememberMe?: boolean | undefined;
    role: "ADMIN" | "CLIENT";
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeTenantId?: string | undefined;
    permissions?: Permission[] | undefined;
    rememberMe?: boolean | undefined;
    revoked?: boolean | undefined;
    role?: "ADMIN" | "CLIENT" | undefined;
    sessionVersion?: number | undefined;
  }
}
