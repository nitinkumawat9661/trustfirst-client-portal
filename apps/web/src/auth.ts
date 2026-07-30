import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@trustfirst/database";
import { AuthenticationService } from "@/server/auth/auth-service";
import { credentialsLoginSchema } from "@/server/auth/schemas";
import { authSessionCookieName, shouldUseSecureAuthCookies } from "@/server/auth/cookie-policy";
import { safeAuthRedirect } from "@/server/auth/redirect-policy";
import type { Permission } from "@/server/authorization/authorization";
import { readRequestMetadata } from "@/server/security/request-metadata";

const secureAuthCookies = shouldUseSecureAuthCookies();
const trustHost = process.env.NODE_ENV !== "production" || process.env.AUTH_TRUST_HOST === "true";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    maxAge: SESSION_MAX_AGE_SECONDS,
    strategy: "jwt",
    updateAge: 30 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  trustHost,
  useSecureCookies: secureAuthCookies,
  cookies: {
    sessionToken: {
      name: authSessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureAuthCookies,
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsLoginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const authService = new AuthenticationService(getPrisma());
        const result = await authService.authorizeCredentials(
          parsed.data,
          readRequestMetadata(request),
        );

        if (!result.ok) {
          return null;
        }

        return {
          activeTenantId: result.user.activeTenantId,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          id: result.user.id,
          name: result.user.name,
          permissions: result.user.permissions,
          rememberMe: result.rememberMe,
          role: result.user.role,
          status: result.user.status,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
    async jwt({ token, user }) {
      const initialSignIn = Boolean(user);

      if (user) {
        token.activeTenantId = user.activeTenantId;
        token.permissions = user.permissions;
        token.rememberMe = user.rememberMe;
        token.role = user.role;
      }

      if (!token.sub) {
        token.revoked = true;
        token.permissions = [];
        return token;
      }

      const activeTenantId =
        typeof token.activeTenantId === "string" ? token.activeTenantId : undefined;
      const dbUser = await getPrisma().user.findUnique({
        select: {
          role: true,
          sessionVersion: true,
          status: true,
          tenantMemberships: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              tenantId: true,
              role: {
                select: {
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          key: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            take: 1,
            where: {
              ...(activeTenantId ? { tenantId: activeTenantId } : {}),
              status: "ACTIVE",
              tenant: {
                status: {
                  in: ["ACTIVE", "TRIAL"],
                },
              },
            },
          },
        },
        where: { id: token.sub },
      });
      const membership = dbUser?.tenantMemberships[0];
      const sessionVersionMatches =
        initialSignIn || token.sessionVersion === dbUser?.sessionVersion;

      if (
        !dbUser ||
        !membership ||
        ["DISABLED", "SUSPENDED", "LOCKED"].includes(dbUser.status) ||
        !sessionVersionMatches
      ) {
        token.activeTenantId = undefined;
        token.permissions = [];
        token.revoked = true;
        return token;
      }

      token.activeTenantId = membership.tenantId;
      token.permissions = [
        ...new Set(
          membership.role.permissions.map((entry) => entry.permission.key),
        ),
      ] as Permission[];
      token.revoked = false;
      token.role = dbUser.role;
      token.sessionVersion = dbUser.sessionVersion;

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && !token.revoked) {
        session.user.id = token.sub;
        session.user.activeTenantId =
          typeof token.activeTenantId === "string" ? token.activeTenantId : undefined;
        session.user.permissions = Array.isArray(token.permissions)
          ? (token.permissions as Permission[])
          : [];
        if (token.role === "ADMIN" || token.role === "CLIENT") {
          session.user.role = token.role;
        }
      }

      return session;
    },
  },
});
